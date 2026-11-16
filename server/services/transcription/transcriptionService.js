const Transcript = require('../../models/Transcript');

class TranscriptionService {
  async getOrCreateTranscript(callId) {
    let transcript = await Transcript.findOne({ callId });
    if (!transcript) {
      transcript = new Transcript({ callId, messages: [] });
      await transcript.save();
    }
    return transcript;
  }

  async appendMessage(callId, speaker, text) {
    let transcript = await this.getOrCreateTranscript(callId);
    const cleanText = (text || '').trim();

    // Prevent inserting duplicate consecutive message within 2.5 seconds
    const lastMsg = transcript.messages[transcript.messages.length - 1];
    if (
      lastMsg &&
      lastMsg.speaker === speaker &&
      lastMsg.text.trim().toLowerCase() === cleanText.toLowerCase() &&
      Date.now() - new Date(lastMsg.timestamp).getTime() < 2500
    ) {
      console.log(`[TranscriptionService] Duplicate message suppressed in DB for callId=${callId}`);
      return lastMsg;
    }

    transcript.messages.push({
      speaker,
      text: cleanText,
      timestamp: new Date()
    });
    await transcript.save();
    return transcript.messages[transcript.messages.length - 1];
  }

  async getTranscriptByCallId(callId) {
    return await Transcript.findOne({ callId });
  }
}

module.exports = new TranscriptionService();
