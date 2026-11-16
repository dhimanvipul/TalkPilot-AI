const crypto = require('crypto');

/**
 * ElevenLabs Text-to-Speech Service for TalkPilot AI
 * Provides ultra-realistic, human-like voice synthesis for live calls.
 */
class TTSService {
  constructor() {
    this.audioCache = new Map(); // audioId -> { buffer, contentType, createdAt, text, voiceId }
    this.maxCacheSize = 250;

    // Curated ElevenLabs premade voices verified to work on both Free and Paid tiers
    this.defaultVoices = [
      { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'Female', description: 'Clear, confident, conversational female' },
      { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'Male', description: 'Warm, professional, resonant male' },
      { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'Female', description: 'Friendly, warm, engaging female' },
      { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female', description: 'Velvety, calm, gentle female' },
      { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'Female', description: 'Enthusiastic, bright female' },
      { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'Male', description: 'Deep, rich, trustworthy male' },
      { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male', description: 'Authoritative, clear British male' },
      { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male', description: 'Youthful, dynamic, clear male' }
    ];
  }

  getApiKey() {
    return process.env.ELEVENLABS_API_KEY || '';
  }

  getDefaultVoiceId() {
    return process.env.ELEVENLABS_VOICE_ID || 'Xb7hH8MSUJpSbSDYk0k2'; // Alice default (Verified working on free tier)
  }

  isConfigured() {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 10 && !key.includes('your_'));
  }

  /**
   * Cleans text before passing to ElevenLabs TTS
   * Strips markdown, emojis, HTML tags, and ensures natural pronunciation
   */
  cleanTextForSpeech(raw) {
    if (!raw || typeof raw !== 'string') return '';

    let text = raw.trim();

    // 1. Remove thinking tags if LLM generated them
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Remove markdown formatting first
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    text = text.replace(/__(.*?)__/g, '$1');
    text = text.replace(/_(.*?)_/g, '$1');
    text = text.replace(/`([^`]+)`/g, '$1');
    text = text.replace(/^#+\s*/gm, '');
    text = text.replace(/^[-*•]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');

    // 3. Remove speaker prefixes like "AI:", "TalkPilot:", "Rachel:"
    text = text.replace(/^(TalkPilot|AI|Assistant|Counselor|Officer|Agent|Representative|Rachel|Adam)\s*:\s*/i, '');

    // 4. Expand common abbreviations and currency for natural voice pronunciation
    text = text.replace(/₹\s*(\d+)/g, '$1 rupees');
    text = text.replace(/\bLPA\b/g, 'Lakh per annum');
    text = text.replace(/\bCSE\b/g, 'C S E');
    text = text.replace(/\bAI\/ML\b/gi, 'A I and Machine Learning');
    text = text.replace(/\bAI-ML\b/gi, 'A I and Machine Learning');
    text = text.replace(/\bB\.Tech\b/gi, 'B Tech');
    text = text.replace(/\bM\.Tech\b/gi, 'M Tech');
    text = text.replace(/\bNAAC\b/g, 'N A A C');

    // 5. Remove emojis
    text = text.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ''
    );

    // 6. Collapse whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Generates a deterministic hash for caching audio
   */
  getCacheKey(voiceId, text, modelId = 'eleven_turbo_v2_5') {
    return crypto
      .createHash('md5')
      .update(`${voiceId}:${modelId}:${text.trim().toLowerCase()}`)
      .digest('hex');
  }

  /**
   * Synthesize speech using ElevenLabs API
   * Returns: { success, audioId, audioUrl, audioBase64, format, voiceId, durationEstMs }
   */
  async synthesizeSpeech({ text, voiceId, modelId = 'eleven_turbo_v2_5', voiceSettings = null }) {
    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      return { success: false, message: 'Empty text to synthesize' };
    }

    const selectedVoiceId = voiceId || this.getDefaultVoiceId();
    const cacheKey = this.getCacheKey(selectedVoiceId, cleanText, modelId);

    // 1. Check cache first for instant retrieval (0ms latency!)
    if (this.audioCache.has(cacheKey)) {
      const cached = this.audioCache.get(cacheKey);
      return {
        success: true,
        cached: true,
        audioId: cacheKey,
        audioUrl: `/api/tts/audio/${cacheKey}.mp3`,
        audioBase64: cached.buffer.toString('base64'),
        format: 'audio/mpeg',
        voiceId: selectedVoiceId,
        text: cleanText
      };
    }

    // 2. Check if ElevenLabs is configured
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        fallback: 'browser',
        message: 'ElevenLabs API key not configured. Set ELEVENLABS_API_KEY in server .env or Settings.',
        text: cleanText
      };
    }

    // 3. Call ElevenLabs API
    try {
      const settings = voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.1,
        use_speaker_boost: true
      };

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg'
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: modelId,
          voice_settings: settings
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[ElevenLabs TTS] API error (${response.status}):`, errorText);

        // If error is 402 / library voice restriction, retry with working premade voice (Alice)
        if ((response.status === 402 || errorText.includes('library voices')) && selectedVoiceId !== 'Xb7hH8MSUJpSbSDYk0k2') {
          console.log('[ElevenLabs TTS] Retrying with verified free premade voice Alice (Xb7hH8MSUJpSbSDYk0k2)...');
          return this.synthesizeSpeech({
            text: cleanText,
            voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
            modelId,
            voiceSettings
          });
        }

        return {
          success: false,
          fallback: 'browser',
          status: response.status,
          message: `ElevenLabs error: ${errorText}`,
          text: cleanText
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Store in memory cache
      if (this.audioCache.size >= this.maxCacheSize) {
        // Evict oldest item
        const firstKey = this.audioCache.keys().next().value;
        this.audioCache.delete(firstKey);
      }

      this.audioCache.set(cacheKey, {
        buffer,
        contentType: 'audio/mpeg',
        createdAt: new Date(),
        text: cleanText,
        voiceId: selectedVoiceId
      });

      console.log(`[ElevenLabs TTS] Successfully synthesized ${buffer.length} bytes for: "${cleanText.substring(0, 45)}..."`);

      return {
        success: true,
        cached: false,
        audioId: cacheKey,
        audioUrl: `/api/tts/audio/${cacheKey}.mp3`,
        audioBase64: buffer.toString('base64'),
        format: 'audio/mpeg',
        voiceId: selectedVoiceId,
        text: cleanText
      };
    } catch (err) {
      console.error('[ElevenLabs TTS] Request failed:', err.message);
      return {
        success: false,
        fallback: 'browser',
        message: err.message,
        text: cleanText
      };
    }
  }

  /**
   * Retrieves audio buffer from memory cache
   */
  getAudio(audioId) {
    if (!audioId) return null;
    const cleanId = audioId.replace(/\.mp3$/i, '');
    return this.audioCache.get(cleanId);
  }

  /**
   * Get available voices (from ElevenLabs API if key present, else default list)
   */
  async getVoices() {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return this.defaultVoices;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.voices)) {
          return data.voices.map((v) => ({
            id: v.voice_id,
            name: v.name,
            gender: v.labels?.gender || 'Unspecified',
            description: v.labels?.description || v.category || 'Human voice',
            previewUrl: v.preview_url
          }));
        }
      }
    } catch (err) {
      console.warn('[ElevenLabs TTS] Failed to fetch remote voices list, returning defaults:', err.message);
    }

    return this.defaultVoices;
  }
}

module.exports = new TTSService();
