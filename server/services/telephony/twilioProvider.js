const twilio = require('twilio');
const Call = require('../../models/Call');
const AIAgent = require('../../models/AIAgent');

class TwilioTelephonyProvider {
  constructor() {
    this.name = 'TwilioTelephonyProvider';
  }

  getCredentials() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TELEPHONY_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TELEPHONY_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TELEPHONY_FROM_NUMBER;
    const publicWebhookUrl = process.env.PUBLIC_WEBHOOK_URL || process.env.TELEPHONY_WEBHOOK_BASE_URL || 'http://localhost:5000';
    return { accountSid, authToken, fromNumber, publicWebhookUrl };
  }

  isConfigured() {
    const { accountSid, authToken, fromNumber } = this.getCredentials();
    return Boolean(
      accountSid &&
      authToken &&
      fromNumber &&
      !accountSid.includes('mock') &&
      !accountSid.includes('AC_mock')
    );
  }

  getClient() {
    const { accountSid, authToken } = this.getCredentials();
    if (!this.isConfigured()) {
      throw new Error(
        'Real calling is not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER in environment variables.'
      );
    }
    return twilio(accountSid, authToken);
  }

  async initiateCall({ call, agent, contact, io }) {
    if (!this.isConfigured()) {
      const errMsg =
        'Real calling is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your server .env file.';
      call.status = 'Failed';
      call.outcome = 'Failed';
      call.lastError = errMsg;
      call.callingMode = 'real';
      call.provider = 'twilio';
      await call.save();

      if (io && call.userId) {
        io.to(`user:${call.userId.toString()}`).emit('call:status', {
          callId: call._id,
          status: 'Failed',
          message: errMsg,
          error: errMsg
        });
      }
      throw new Error(errMsg);
    }

    const { fromNumber, publicWebhookUrl } = this.getCredentials();
    const client = this.getClient();

    try {
      console.log(`[Twilio Real Mode] Initiating outbound PSTN call to ${contact.phone} from ${fromNumber}`);

      // Webhook URLs for voice TwiML and status updates
      const voiceUrl = `${publicWebhookUrl}/api/webhooks/telephony/voice?agentId=${agent._id}&callId=${call._id}`;
      const statusCallbackUrl = `${publicWebhookUrl}/api/webhooks/telephony/status`;

      const twilioCall = await client.calls.create({
        to: contact.phone,
        from: fromNumber,
        url: voiceUrl,
        statusCallback: statusCallbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });

      call.status = 'Initiating';
      call.callingMode = 'real';
      call.provider = 'twilio';
      call.providerCallId = twilioCall.sid;
      call.telephonyCallSid = twilioCall.sid;
      call.fromNumber = fromNumber;
      call.toNumber = contact.phone;
      call.lastWebhookStatus = twilioCall.status;
      call.lastWebhookReceivedAt = new Date();
      await call.save();

      if (io && call.userId) {
        io.to(`user:${call.userId.toString()}`).emit('call:status', {
          callId: call._id,
          status: 'Initiating',
          message: `Outbound call dispatched to Twilio (SID: ${twilioCall.sid}). Waiting for ringing...`,
          providerCallId: twilioCall.sid
        });
      }

      return {
        success: true,
        providerCallId: twilioCall.sid,
        telephonyCallSid: twilioCall.sid,
        status: twilioCall.status
      };
    } catch (err) {
      console.error('[Twilio API Error]:', err.message);
      const safeErrorMsg = `Twilio API Error: ${err.message}`;

      call.status = 'Failed';
      call.outcome = 'Failed';
      call.lastError = safeErrorMsg;
      call.callingMode = 'real';
      call.provider = 'twilio';
      await call.save();

      if (io && call.userId) {
        io.to(`user:${call.userId.toString()}`).emit('call:status', {
          callId: call._id,
          status: 'Failed',
          message: safeErrorMsg,
          error: safeErrorMsg
        });
      }
      throw new Error(safeErrorMsg);
    }
  }

  async endCall(callSid, io) {
    if (!this.isConfigured()) {
      return { success: false, message: 'Real calling is not configured' };
    }
    try {
      const client = this.getClient();
      const twilioCall = await client.calls(callSid).update({ status: 'completed' });

      const call = await Call.findOne({
        $or: [{ providerCallId: callSid }, { telephonyCallSid: callSid }]
      });
      if (call) {
        call.status = 'Completed';
        call.endTime = new Date();
        if (call.startTime) {
          call.duration = Math.round((call.endTime - call.startTime) / 1000);
        }
        await call.save();

        if (io && call.userId) {
          io.to(`user:${call.userId.toString()}`).emit('call:ended', {
            callId: call._id,
            status: 'Completed',
            duration: call.duration
          });
        }
      }

      return { success: true, message: 'Twilio call hangup request sent', twilioCall };
    } catch (err) {
      console.error('Twilio endCall error:', err);
      return { success: false, message: err.message };
    }
  }

  async getCallStatus(callSid) {
    if (!this.isConfigured()) {
      return { status: 'not-configured' };
    }
    try {
      const client = this.getClient();
      const twilioCall = await client.calls(callSid).fetch();
      return { status: twilioCall.status, duration: twilioCall.duration, price: twilioCall.price };
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }
}

module.exports = new TwilioTelephonyProvider();
