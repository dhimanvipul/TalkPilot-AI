const transcriptionService = require('../transcription/transcriptionService');
const aiEngine = require('../ai/aiEngine');
const ttsService = require('../audio/ttsService');
const Call = require('../../models/Call');
const AIAgent = require('../../models/AIAgent');
const Contact = require('../../models/Contact');
const Campaign = require('../../models/Campaign');

class MockTelephonyProvider {
  constructor() {
    this.name = 'MockTelephonyProvider';
    this.activeCalls = new Map();
    this.answeringCalls = new Set();
    this.lastProcessedMessage = new Map();
    this.processingCalls = new Set();
  }

  /**
   * Helper that delivers an event to all call rooms without duplicate socket emissions.
   * Socket.IO chains .to(room1).to(room2) so that sockets in multiple rooms receive EXACTLY ONE packet.
   */
  emitCallEvent(io, call, contact, eventName, payload) {
    if (!io) return;
    const callId = (call?._id ? call._id.toString() : (call?.id || call || '')).toString();
    const rooms = new Set();
    if (callId) rooms.add(`call:${callId}`);
    if (call?.userId) rooms.add(`user:${call.userId.toString()}`);
    if (call?.recipientUserId) rooms.add(`user:${call.recipientUserId.toString()}`);
    if (contact?.email) rooms.add(`user:email:${contact.email.toLowerCase().trim()}`);

    let broadcaster = io;
    for (const room of rooms) {
      broadcaster = broadcaster.to(room);
    }
    broadcaster.emit(eventName, payload);
  }

  /**
   * Resolves ElevenLabs voice ID from Agent voice setting
   */
  resolveVoiceId(agent) {
    const rawVoice = agent?.voice || '';
    if (rawVoice.startsWith('elevenlabs:')) {
      return rawVoice.replace('elevenlabs:', '');
    }
    if (rawVoice.length > 15 && !rawVoice.includes(' ')) {
      return rawVoice;
    }
    // Check known mappings to verified free ElevenLabs premade voices
    if (rawVoice.includes('Neural2-M') || rawVoice.includes('Male') || rawVoice.includes('Adam') || rawVoice.includes('George')) {
      return 'JBFqnCBsd6RMkjVDRZzb'; // George (Premade Male)
    }
    if (rawVoice.includes('Jessica')) {
      return 'cgSgspJ2msm6clMCkdW9'; // Jessica
    }
    if (rawVoice.includes('Lily')) {
      return 'pFZP5JQG7iQjIQuC4Bku'; // Lily
    }
    return ttsService.getDefaultVoiceId(); // Alice default (Premade Female)
  }

  /**
   * Initiates a mock call and dispatches incoming ring to recipient dashboard if email is linked
   */
  async initiateCall({ call, agent, contact, campaign, io, caller }) {
    const callId = call._id.toString();

    // If campaign is not explicitly provided, try to resolve from call.campaignId
    if (!campaign && call.campaignId) {
      if (call.campaignId.name) {
        campaign = call.campaignId;
      } else {
        try {
          campaign = await Campaign.findById(call.campaignId);
        } catch (e) {
          console.warn('[MockTelephonyProvider] Could not resolve campaign by ID:', e.message);
        }
      }
    }

    const campaignConfig = aiEngine.resolveCampaignConfig({ campaign, agent, contact });
    const campaignName = campaignConfig.campaignName;
    const agentRole = campaignConfig.agentRole;
    const callObjective = campaignConfig.campaignObjective;

    // Store active call state
    this.activeCalls.set(callId, {
      call,
      agent,
      contact,
      campaign,
      caller,
      status: 'Ringing',
      startTime: null,
      ended: false,
      turnCount: 0
    });

    // Update status to Ringing
    call.status = 'Ringing';
    await call.save();

    // Broadcast status to participants without duplicates
    this.emitCallEvent(io, call, contact, 'call:status', {
      callId,
      status: 'Ringing',
      message: `Ringing ${contact.name} (${contact.email || contact.phone})... Waiting for recipient to answer.`
    });

    // Broadcast incoming call notification to recipient dashboard
    const incomingCallPayload = {
      callId,
      caller: {
        id: caller?._id?.toString() || caller?.id || call.userId?.toString(),
        name: caller?.name || call.callerName || `${campaignName} Coordinator`,
        email: caller?.email || call.callerEmail || ''
      },
      agent: {
        id: agent?._id?.toString(),
        name: agentRole,
        voice: agent?.voice || '21m00Tcm4TlvDq8ikWAM',
        callObjective: callObjective
      },
      campaign: {
        id: campaign?._id?.toString() || (call.campaignId?._id ? call.campaignId._id.toString() : call.campaignId?.toString()),
        name: campaignName,
        objective: callObjective
      },
      campaignName: campaignName,
      topic: campaignName,
      contact: {
        id: contact?._id?.toString(),
        name: contact?.name || 'Participant',
        phone: contact?.phone,
        email: contact?.email
      },
      timestamp: new Date()
    };

    console.log(`[MockTelephonyProvider] Dispatched call:incoming for callId=${callId} to recipient=${contact.email} for campaign="${campaignName}"`);

    // Targeted emit to recipient user and email rooms
    if (io) {
      const incomingRooms = new Set();
      if (call.recipientUserId) incomingRooms.add(`user:${call.recipientUserId.toString()}`);
      if (contact && contact.email) incomingRooms.add(`user:email:${contact.email.toLowerCase().trim()}`);

      if (incomingRooms.size > 0) {
        let broadcaster = io;
        for (const room of incomingRooms) {
          broadcaster = broadcaster.to(room);
        }
        broadcaster.emit('call:incoming', incomingCallPayload);
      }

      // Also broadcast for any listening window matching target email
      io.emit('call:incoming_broadcast', {
        ...incomingCallPayload,
        targetEmail: (contact?.email || '').toLowerCase().trim(),
        targetUserId: call.recipientUserId ? call.recipientUserId.toString() : null
      });
    }

    return {
      success: true,
      telephonyCallSid: `MOCK_SID_${Date.now()}_${call._id}`
    };
  }

  /**
   * Called when the recipient picks up / accepts the call
   */
  async acceptCall(callId, io) {
    // Prevent concurrent duplicate executions of acceptCall
    if (this.answeringCalls.has(callId)) {
      console.log(`[MockTelephonyProvider] Call accept already in progress for callId=${callId}`);
      return { success: true, message: 'Call accept already in progress' };
    }
    this.answeringCalls.add(callId);

    try {
      let callState = this.activeCalls.get(callId);
      let call = callState?.call;

      if (!call) {
        call = await Call.findById(callId).populate('agentId').populate('contactId').populate('campaignId');
        if (!call) return { success: false, message: 'Call not found' };
      }

      const agent = callState?.agent || call.agentId;
      const contact = callState?.contact || call.contactId;
      let campaign = callState?.campaign || call.campaignId;
      if (campaign && !campaign.name) {
        try {
          campaign = await Campaign.findById(campaign);
        } catch (e) {
          console.warn('[MockTelephonyProvider] Could not load campaign in acceptCall:', e.message);
        }
      }

      if (callState && campaign && !callState.campaign) {
        callState.campaign = campaign;
      }

      const campaignConfig = aiEngine.resolveCampaignConfig({ campaign, agent, contact });

      if (call.status === 'Completed' || call.status === 'Cancelled') {
        return { success: false, message: 'Call is no longer active' };
      }

      call.status = 'In Progress';
      call.startTime = new Date();
      await call.save();

      if (callState) {
        callState.status = 'In Progress';
        callState.startTime = call.startTime;
      }

      console.log(`[MockTelephonyProvider] Call accepted! callId=${callId} for campaign="${campaignConfig.campaignName}"`);

      // Notify all participants of connected status exactly once
      this.emitCallEvent(io, call, contact, 'call:status', {
        callId,
        status: 'In Progress',
        message: `Call connected! ${campaignConfig.agentRole} is speaking.`
      });

      // Check if greeting already exists in transcript or call state
      if (callState?.greetingSent) {
        return { success: true, message: 'Call already answered', call };
      }
      if (callState) {
        callState.greetingSent = true;
      }

      const existingTranscript = await transcriptionService.getTranscriptByCallId(callId);
      const hasAiGreeting = existingTranscript && existingTranscript.messages.some((m) => m.speaker === 'AI');

      if (!hasAiGreeting) {
        const greeting = aiEngine.generateGreeting({ contact, agent, campaign });
        const voiceId = this.resolveVoiceId(agent);

        setTimeout(async () => {
          // Double-check transcript before saving to prevent race condition
          const currentTranscript = await transcriptionService.getTranscriptByCallId(callId);
          if (currentTranscript && currentTranscript.messages.some((m) => m.speaker === 'AI')) {
            return;
          }

          const savedGreeting = await transcriptionService.appendMessage(callId, 'AI', greeting);

          // Synthesize ElevenLabs voice audio for human-like speech
          let ttsResult = null;
          try {
            ttsResult = await ttsService.synthesizeSpeech({ text: greeting, voiceId });
          } catch (err) {
            console.warn('[MockTelephonyProvider] TTS greeting synthesis error:', err.message);
          }

          const msgPayload = {
            id: savedGreeting?._id?.toString() || `ai_greet_${Date.now()}`,
            speaker: 'AI',
            text: greeting,
            timestamp: savedGreeting?.timestamp || new Date()
          };

          this.emitCallEvent(io, call, contact, 'call:transcript', { callId, message: msgPayload });
          this.emitCallEvent(io, call, contact, 'call:ai_speak', {
            callId,
            text: greeting,
            isGreeting: true,
            audioUrl: ttsResult?.audioUrl || null,
            audioBase64: ttsResult?.audioBase64 || null,
            voiceProvider: ttsResult?.success ? 'elevenlabs' : 'browser'
          });
        }, 400);
      }

      return { success: true, message: 'Call answered successfully', call };
    } finally {
      setTimeout(() => {
        this.answeringCalls.delete(callId);
      }, 1500);
    }
  }

  /**
   * Called when customer/recipient sends a message (via microphone speech or text)
   */
  async handleCustomerMessage(callId, text, io) {
    if (!text || !text.trim()) return { success: false, message: 'Empty message' };

    const cleanText = text.trim();

    // Prevent duplicate processing of identical customer messages within 5 seconds
    const msgKey = `${callId}:${cleanText.toLowerCase()}`;
    const lastTime = this.lastProcessedMessage.get(msgKey);
    const now = Date.now();
    if (lastTime && now - lastTime < 5000) {
      console.log(`[MockTelephonyProvider] Suppressing duplicate customer message within 5s for callId=${callId}: "${cleanText}"`);
      return { success: true, message: 'Duplicate message ignored' };
    }

    // Guard against concurrent processing for the same call
    if (this.processingCalls.has(callId)) {
      console.log(`[MockTelephonyProvider] Suppressing concurrent message processing for callId=${callId}`);
      return { success: true, message: 'Duplicate message ignored' };
    }

    this.lastProcessedMessage.set(msgKey, now);
    this.processingCalls.add(callId);

    try {
      let callState = this.activeCalls.get(callId);
      let call = callState?.call;
      let agent = callState?.agent;
      let contact = callState?.contact;
      let campaign = callState?.campaign;

      if (!call || !agent || !contact) {
        call = await Call.findById(callId).populate('agentId').populate('contactId').populate('campaignId');
        if (!call) return { success: false, message: 'Call not found' };
        agent = agent || call.agentId;
        contact = contact || call.contactId;
      }

      if (!campaign && call?.campaignId) {
        if (call.campaignId.name) {
          campaign = call.campaignId;
        } else {
          try {
            campaign = await Campaign.findById(call.campaignId);
          } catch (e) {
            console.warn('[MockTelephonyProvider] Could not load campaign in handleCustomerMessage:', e.message);
          }
        }
        if (callState) callState.campaign = campaign;
      }

      // 1. Append customer message
      const savedCustomerMsg = await transcriptionService.appendMessage(callId, 'Customer', cleanText);

      const customerMsgPayload = {
        id: savedCustomerMsg?._id?.toString() || `cust_${Date.now()}`,
        speaker: 'Customer',
        text: cleanText,
        timestamp: savedCustomerMsg?.timestamp || new Date()
      };

      this.emitCallEvent(io, call, contact, 'call:transcript', {
        callId,
        message: customerMsgPayload
      });

      // 2. Indicate AI is thinking
      this.emitCallEvent(io, call, contact, 'call:ai_thinking', { callId, isThinking: true });

      // 3. Retrieve conversation history & process AI turn via Dynamic AI Engine
      const transcriptDoc = await transcriptionService.getTranscriptByCallId(callId);
      const messages = transcriptDoc ? transcriptDoc.messages : [];

      const aiResponse = await aiEngine.processConversation({
        call,
        customerMessage: cleanText,
        conversationHistory: messages,
        agent,
        contact,
        campaign
      });

      // 4. Synthesize ElevenLabs voice audio for AI response
      const voiceId = this.resolveVoiceId(agent);
      let ttsResult = null;
      try {
        ttsResult = await ttsService.synthesizeSpeech({ text: aiResponse.text, voiceId });
      } catch (err) {
        console.warn('[MockTelephonyProvider] TTS response synthesis error:', err.message);
      }

      this.emitCallEvent(io, call, contact, 'call:ai_thinking', { callId, isThinking: false });

      const savedAiMsg = await transcriptionService.appendMessage(callId, 'AI', aiResponse.text);

      const aiMsgPayload = {
        id: savedAiMsg?._id?.toString() || `ai_${Date.now()}`,
        speaker: 'AI',
        text: aiResponse.text,
        timestamp: savedAiMsg?.timestamp || new Date()
      };

      this.emitCallEvent(io, call, contact, 'call:transcript', { callId, message: aiMsgPayload });
      this.emitCallEvent(io, call, contact, 'call:ai_speak', {
        callId,
        text: aiResponse.text,
        shouldEndCall: aiResponse.shouldEndCall,
        audioUrl: ttsResult?.audioUrl || null,
        audioBase64: ttsResult?.audioBase64 || null,
        voiceProvider: ttsResult?.success ? 'elevenlabs' : 'browser'
      });

      if (aiResponse.shouldEndCall) {
        setTimeout(async () => {
          await this.finalizeCall(call, agent, contact, io, aiResponse.isOptOut, null, campaign);
        }, 4000);
      }

      return { success: true, message: 'Message processed' };
    } finally {
      setTimeout(() => {
        this.processingCalls.delete(callId);
      }, 1000);
    }
  }

  /**
   * Called when recipient declines incoming call
   */
  async declineCall(callId, io, reason = 'Declined by recipient') {
    let callState = this.activeCalls.get(callId);
    let call = callState?.call || (await Call.findById(callId));

    if (!call) return { success: false, message: 'Call not found' };

    call.status = 'Cancelled';
    call.outcome = 'Busy';
    call.summary = `Call declined on incoming screen (${reason}).`;
    await call.save();

    this.emitCallEvent(io, call, callState?.contact, 'call:status', {
      callId,
      status: 'Cancelled',
      message: 'Call was declined by the recipient.'
    });

    this.emitCallEvent(io, call, callState?.contact, 'call:ended', {
      callId,
      status: 'Cancelled',
      outcome: 'Busy',
      summary: call.summary
    });

    this.activeCalls.delete(callId);
    return { success: true, message: 'Call declined' };
  }

  /**
   * Called to end active call session
   */
  async endCall(callId, io) {
    let callState = this.activeCalls.get(callId);
    let call = callState?.call || (await Call.findById(callId).populate('agentId').populate('contactId').populate('campaignId'));

    if (!call) return { success: false, message: 'Call not found' };

    const agent = callState?.agent || call.agentId;
    const contact = callState?.contact || call.contactId;
    const campaign = callState?.campaign || call.campaignId;

    await this.finalizeCall(call, agent, contact, io, false, 'Completed', campaign);
    return { success: true, message: 'Call ended successfully' };
  }

  /**
   * Finalizes call, generates summary & outcome, saves duration & recording
   */
  async finalizeCall(call, agent, contact, io, wasOptedOut = false, forcedStatus = null, campaign = null) {
    const callId = call._id.toString();
    call.endTime = new Date();
    call.duration = Math.max(1, Math.round((call.endTime - (call.startTime || call.endTime)) / 1000));

    if (!campaign) {
      const callState = this.activeCalls.get(callId);
      campaign = callState?.campaign || call.campaignId;
      if (campaign && !campaign.name) {
        try {
          campaign = await Campaign.findById(campaign);
        } catch (e) {
          // ignore
        }
      }
    }

    const transcriptDoc = await transcriptionService.getTranscriptByCallId(callId);
    const messages = transcriptDoc ? transcriptDoc.messages : [];

    const aiSummary = await aiEngine.generateSummary(agent, messages, wasOptedOut, campaign);

    call.status = forcedStatus || (wasOptedOut ? 'Opted Out' : 'Completed');
    call.outcome = aiSummary.outcome;
    call.summary = aiSummary.summary;
    call.intent = aiSummary.intent;
    call.actionRequired = aiSummary.actionRequired;
    call.recordingUrl = `https://talkpilot-mock-recordings.s3.amazonaws.com/call_rec_${callId}.mp3`;

    await call.save();

    // Increment agent statistics
    if (agent) {
      agent.totalCalls = (agent.totalCalls || 0) + 1;
      await agent.save();
    }

    this.emitCallEvent(io, call, contact, 'call:status', {
      callId,
      status: call.status,
      message: 'Call concluded.'
    });

    this.emitCallEvent(io, call, contact, 'call:ended', {
      callId,
      status: call.status,
      duration: call.duration,
      outcome: call.outcome,
      summary: call.summary,
      intent: call.intent,
      actionRequired: call.actionRequired,
      recordingUrl: call.recordingUrl
    });

    this.activeCalls.delete(callId);
  }

  async getCallStatus(callSid) {
    return { status: 'completed', duration: 30 };
  }

  async getRecording(callSid) {
    return { recordingUrl: 'https://talkpilot-mock-recordings.s3.amazonaws.com/sample_audio.mp3' };
  }
}

module.exports = new MockTelephonyProvider();
