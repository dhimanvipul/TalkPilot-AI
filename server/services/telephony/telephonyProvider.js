const mockProvider = require('./mockProvider');
const twilioProvider = require('./twilioProvider');

class TelephonyDispatcher {
  getProvider() {
    const mode = (process.env.CALLING_MODE || 'mock').toLowerCase();
    if (mode === 'real') {
      return twilioProvider;
    }
    return mockProvider;
  }

  async initiateCall(payload) {
    const provider = this.getProvider();
    console.log(`[TelephonyDispatcher] Routing call to provider: ${provider.name} (Mode: ${process.env.CALLING_MODE || 'mock'})`);
    return await provider.initiateCall(payload);
  }

  async acceptCall(callId, io) {
    const provider = this.getProvider();
    if (provider.acceptCall) {
      return await provider.acceptCall(callId, io);
    }
    return { success: true };
  }

  async declineCall(callId, io, reason) {
    const provider = this.getProvider();
    if (provider.declineCall) {
      return await provider.declineCall(callId, io, reason);
    }
    return { success: true };
  }

  async handleCustomerMessage(callId, text, io) {
    const provider = this.getProvider();
    if (provider.handleCustomerMessage) {
      return await provider.handleCustomerMessage(callId, text, io);
    }
    return { success: true };
  }

  async endCall(callId, io) {
    const provider = this.getProvider();
    return await provider.endCall(callId, io);
  }

  async getCallStatus(callSid) {
    const provider = this.getProvider();
    return await provider.getCallStatus(callSid);
  }

  async getRecording(callSid) {
    const provider = this.getProvider();
    return await provider.getRecording(callSid);
  }
}

module.exports = new TelephonyDispatcher();
