const Call = require('../models/Call');
const Campaign = require('../models/Campaign');
const AIAgent = require('../models/AIAgent');
const Transcript = require('../models/Transcript');
const aiEngine = require('../services/ai/aiEngine');
const ttsService = require('../services/audio/ttsService');

// Helper to escape XML special characters for valid TwiML
const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Map Twilio CallStatus strings to TalkPilot AI statuses
const mapTwilioStatus = (status) => {
  if (!status) return 'Initiating';
  const s = status.toLowerCase();
  if (s === 'queued' || s === 'initiated') return 'Initiating';
  if (s === 'ringing') return 'Ringing';
  if (s === 'in-progress') return 'In Progress';
  if (s === 'completed') return 'Completed';
  if (s === 'busy') return 'Busy';
  if (s === 'no-answer') return 'No Answer';
  if (s === 'failed') return 'Failed';
  if (s === 'canceled' || s === 'cancelled') return 'Cancelled';
  return 'In Progress';
};

// POST /api/webhooks/telephony/status
const handleTelephonyStatus = async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body || req.query || {};
    console.log(`[Twilio Webhook Status] CallSid: ${CallSid}, Status: ${CallStatus}, Duration: ${CallDuration}`);

    if (!CallSid) {
      return res.type('text/xml').send('<Response></Response>');
    }

    const call = await Call.findOne({
      $or: [{ providerCallId: CallSid }, { telephonyCallSid: CallSid }]
    });

    if (call) {
      const newStatus = mapTwilioStatus(CallStatus);
      call.status = newStatus;
      call.lastWebhookStatus = CallStatus;
      call.lastWebhookReceivedAt = new Date();

      if (CallStatus === 'in-progress' && !call.startTime) {
        call.startTime = new Date();
      }

      const isTerminal = ['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(
        (CallStatus || '').toLowerCase()
      );

      if (isTerminal) {
        call.endTime = new Date();
        if (CallDuration) {
          call.duration = parseInt(CallDuration, 10);
        } else if (call.startTime) {
          call.duration = Math.round((call.endTime - call.startTime) / 1000);
        }

        if (CallStatus === 'completed') call.outcome = 'Completed';
        if (CallStatus === 'busy') call.outcome = 'Busy';
        if (CallStatus === 'no-answer') call.outcome = 'No Answer';
        if (CallStatus === 'failed') call.outcome = 'Failed';
        if (CallStatus === 'canceled') call.outcome = 'Cancelled';

        // Fetch transcript & generate summary for completed calls
        const transcriptDoc = await Transcript.findOne({ callId: call._id });
        const messages = transcriptDoc ? transcriptDoc.messages : [];
        if (messages.length > 0) {
          const analysis = await aiEngine.generateSummary(messages);
          call.summary = analysis.summary;
          call.intent = analysis.intent;
          call.actionRequired = analysis.actionRequired;
          if (analysis.outcome) call.outcome = analysis.outcome;
        }
      }

      await call.save();

      // Emit Socket.IO events to user room
      const io = req.app.get('io');
      if (io && call.userId) {
        const room = `user:${call.userId.toString()}`;
        io.to(room).emit('call:status', {
          callId: call._id,
          status: newStatus,
          providerCallId: CallSid,
          rawStatus: CallStatus,
          message: `Provider update: ${CallStatus}`
        });

        if (isTerminal) {
          io.to(room).emit('call:ended', {
            callId: call._id,
            status: newStatus,
            duration: call.duration,
            outcome: call.outcome
          });
        }

        if (call.campaignId) {
          const campaign = await Campaign.findById(call.campaignId);
          if (campaign) {
            if (newStatus === 'Completed') campaign.stats.completed = (campaign.stats.completed || 0) + 1;
            if (newStatus === 'Failed') campaign.stats.failed = (campaign.stats.failed || 0) + 1;
            if (newStatus === 'No Answer') campaign.stats.noAnswer = (campaign.stats.noAnswer || 0) + 1;
            if (newStatus === 'Busy') campaign.stats.busy = (campaign.stats.busy || 0) + 1;
            await campaign.save();

            io.to(room).emit('campaign:updated', {
              campaignId: campaign._id,
              status: campaign.status,
              stats: campaign.stats
            });
          }
        }
      }
    }

    res.type('text/xml').send('<Response></Response>');
  } catch (err) {
    console.error('Error handling telephony status webhook:', err);
    res.type('text/xml').send('<Response></Response>');
  }
};

// POST /api/webhooks/telephony/voice
// Twilio TwiML Voice Entry Point when customer answers
const handleTelephonyVoice = async (req, res) => {
  try {
    const { agentId, callId } = req.query;
    console.log(`[Twilio Voice Webhook] Answered callId: ${callId}, agentId: ${agentId}`);

    const call = callId ? await Call.findById(callId).populate('contactId').populate('agentId') : null;
    const agent = agentId ? await AIAgent.findById(agentId) : call?.agentId;
    const contact = call?.contactId;

    let greeting = aiEngine.generateGreeting({ contact, agent, campaign: null });

    // Save initial greeting to transcript
    if (callId) {
      let transcript = await Transcript.findOne({ callId });
      if (!transcript) {
        transcript = new Transcript({ callId, messages: [] });
      }
      transcript.messages.push({
        speaker: 'AI',
        text: greeting,
        timestamp: new Date()
      });
      await transcript.save();

      const io = req.app.get('io');
      if (io && call) {
        io.to(`user:${call.userId.toString()}`).emit('call:transcript', {
          callId: call._id,
          message: { speaker: 'AI', text: greeting, timestamp: new Date() }
        });
      }
    }

    const publicBase = process.env.PUBLIC_WEBHOOK_URL || '';
    let speechTag = `<Say voice="Polly.Joanna-Neural">${escapeXml(greeting)}</Say>`;

    // If ElevenLabs is configured, generate human-like audio file for Twilio <Play>
    if (ttsService.isConfigured() && publicBase) {
      try {
        const tts = await ttsService.synthesizeSpeech({ text: greeting, voiceId: agent?.voice });
        if (tts.success && tts.audioUrl) {
          speechTag = `<Play>${publicBase}${tts.audioUrl}</Play>`;
        }
      } catch (e) {
        console.warn('[Twilio Voice] ElevenLabs synthesis failed, using Polly:', e.message);
      }
    }

    const respondUrl = `/api/webhooks/telephony/respond?agentId=${agentId || ''}&amp;callId=${callId || ''}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${speechTag}
  <Gather input="speech" action="${respondUrl}" speechTimeout="auto" timeout="4">
  </Gather>
  <Say voice="Polly.Joanna-Neural">Thank you for your time. Goodbye!</Say>
  <Hangup/>
</Response>`;

    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('Error in handleTelephonyVoice:', err);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred connecting to TalkPilot AI. Goodbye.</Say>
  <Hangup/>
</Response>`;
    res.type('text/xml').send(twiml);
  }
};

// POST /api/webhooks/telephony/respond
// Twilio Speech Recognition callback loop
const handleTelephonyRespond = async (req, res) => {
  try {
    const { agentId, callId } = req.query;
    const { SpeechResult } = req.body || {};

    console.log(`[Twilio Speech Result] User said: "${SpeechResult}"`);

    if (!SpeechResult || !SpeechResult.trim()) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">Thank you for speaking with TalkPilot AI. Have a great day!</Say>
  <Hangup/>
</Response>`;
      return res.type('text/xml').send(twiml);
    }

    const lowerSpeech = SpeechResult.toLowerCase();
    const isOptOut =
      lowerSpeech.includes('stop calling') ||
      lowerSpeech.includes('opt out') ||
      lowerSpeech.includes('do not call') ||
      lowerSpeech.includes('remove my number');

    let transcriptDoc = await Transcript.findOne({ callId });
    if (!transcriptDoc) {
      transcriptDoc = new Transcript({ callId, messages: [] });
    }

    // Record user message
    transcriptDoc.messages.push({
      speaker: 'User',
      text: SpeechResult,
      timestamp: new Date()
    });

    const call = await Call.findById(callId);
    const agent = agentId ? await AIAgent.findById(agentId) : null;
    const io = req.app.get('io');

    if (io && call) {
      io.to(`user:${call.userId.toString()}`).emit('call:transcript', {
        callId: call._id,
        message: { speaker: 'User', text: SpeechResult, timestamp: new Date() }
      });
    }

    if (isOptOut) {
      const optOutReply = 'Understood. We have recorded your opt-out request and will remove your number. Goodbye!';
      transcriptDoc.messages.push({
        speaker: 'AI',
        text: optOutReply,
        timestamp: new Date()
      });
      await transcriptDoc.save();

      if (call) {
        call.status = 'Opted Out';
        call.outcome = 'Opted Out';
        call.summary = 'Customer explicitly requested opt-out during call.';
        await call.save();
      }

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">${escapeXml(optOutReply)}</Say>
  <Hangup/>
</Response>`;
      return res.type('text/xml').send(twiml);
    }

    // Generate AI response via dynamic conversational AI engine
    const contact = call?.contactId;
    const aiRes = await aiEngine.processConversation({
      call,
      customerMessage: SpeechResult,
      conversationHistory: transcriptDoc.messages,
      agent,
      contact
    });
    const aiReply = aiRes.text;

    transcriptDoc.messages.push({
      speaker: 'AI',
      text: aiReply,
      timestamp: new Date()
    });
    await transcriptDoc.save();

    if (io && call) {
      io.to(`user:${call.userId.toString()}`).emit('call:transcript', {
        callId: call._id,
        message: { speaker: 'AI', text: aiReply, timestamp: new Date() }
      });
    }

    const publicBase = process.env.PUBLIC_WEBHOOK_URL || '';
    let speechTag = `<Say voice="Polly.Joanna-Neural">${escapeXml(aiReply)}</Say>`;

    // If ElevenLabs is configured, generate human-like audio file for Twilio <Play>
    if (ttsService.isConfigured() && publicBase) {
      try {
        const tts = await ttsService.synthesizeSpeech({ text: aiReply, voiceId: agent?.voice });
        if (tts.success && tts.audioUrl) {
          speechTag = `<Play>${publicBase}${tts.audioUrl}</Play>`;
        }
      } catch (e) {
        console.warn('[Twilio Voice] ElevenLabs synthesis failed, using Polly:', e.message);
      }
    }

    if (aiRes.shouldEndCall) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${speechTag}
  <Hangup/>
</Response>`;
      return res.type('text/xml').send(twiml);
    }

    const respondUrl = `/api/webhooks/telephony/respond?agentId=${agentId || ''}&amp;callId=${callId || ''}`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${speechTag}
  <Gather input="speech" action="${respondUrl}" speechTimeout="auto" timeout="4">
  </Gather>
  <Say voice="Polly.Joanna-Neural">Thank you for speaking with us. Goodbye!</Say>
  <Hangup/>
</Response>`;

    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('Error in handleTelephonyRespond:', err);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for speaking with us. Goodbye.</Say>
  <Hangup/>
</Response>`;
    res.type('text/xml').send(twiml);
  }
};

// POST /api/webhooks/telephony/recording
const handleTelephonyRecording = async (req, res) => {
  try {
    const { CallSid, RecordingUrl } = req.body || req.query || {};
    console.log(`[Webhook Recording] CallSid: ${CallSid}, Url: ${RecordingUrl}`);

    if (CallSid && RecordingUrl) {
      const call = await Call.findOne({
        $or: [{ providerCallId: CallSid }, { telephonyCallSid: CallSid }]
      });
      if (call) {
        call.recordingUrl = RecordingUrl;
        await call.save();
      }
    }
    res.status(200).send('OK');
  } catch (err) {
    res.status(500).send('Error');
  }
};

const handleTelephonyAudio = async (req, res) => {
  res.status(200).send('OK');
};

module.exports = {
  handleTelephonyStatus,
  handleTelephonyVoice,
  handleTelephonyRespond,
  handleTelephonyRecording,
  handleTelephonyAudio
};
