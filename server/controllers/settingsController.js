const ttsService = require('../services/audio/ttsService');
const freeAiClient = require('../services/ai/freeAiClient');

// In-memory or env-backed platform settings store
let memorySettings = {
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
  aiProvider: process.env.AI_PROVIDER || 'free',
  aiModel: process.env.AI_MODEL || '',
  defaultLanguage: 'en-US',
  defaultVoice: '21m00Tcm4TlvDq8ikWAM',
  maxConcurrentCalls: 5,
  retryAttempts: 2,
  retryDelaySeconds: 300,
  maxCallDuration: 300,
  consentRequired: true,
  optOutHandling: true,
  dncProtection: true,
  callingHoursStart: '09:00',
  callingHoursEnd: '18:00'
};

// GET /api/settings
const getSettings = async (req, res) => {
  try {
    const hasElevenLabs = ttsService.isConfigured();
    const hasGroq = Boolean(process.env.GROQ_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY);

    const voices = await ttsService.getVoices();

    res.json({
      success: true,
      settings: {
        ...memorySettings,
        elevenLabsConfigured: hasElevenLabs,
        elevenLabsKeyMasked: hasElevenLabs ? '••••••••' + (process.env.ELEVENLABS_API_KEY || '').slice(-4) : '',
        groqConfigured: hasGroq,
        geminiConfigured: hasGemini,
        openAiConfigured: hasOpenAI,
        activeAiProvider: process.env.AI_PROVIDER || 'free'
      },
      availableVoices: voices
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/settings
const updateSettings = async (req, res) => {
  try {
    const {
      elevenLabsApiKey,
      elevenLabsVoiceId,
      aiProvider,
      geminiApiKey,
      groqApiKey,
      openAiApiKey,
      ...otherSettings
    } = req.body || {};

    // Update in-memory process environment variables dynamically
    if (elevenLabsApiKey && typeof elevenLabsApiKey === 'string' && !elevenLabsApiKey.includes('••••')) {
      process.env.ELEVENLABS_API_KEY = elevenLabsApiKey.trim();
    }
    if (elevenLabsVoiceId) {
      process.env.ELEVENLABS_VOICE_ID = elevenLabsVoiceId.trim();
      memorySettings.elevenLabsVoiceId = elevenLabsVoiceId.trim();
      memorySettings.defaultVoice = elevenLabsVoiceId.trim();
    }

    if (aiProvider) {
      process.env.AI_PROVIDER = aiProvider.trim();
      memorySettings.aiProvider = aiProvider.trim();
    }

    if (geminiApiKey && typeof geminiApiKey === 'string' && !geminiApiKey.includes('••••')) {
      process.env.GEMINI_API_KEY = geminiApiKey.trim();
    }
    if (groqApiKey && typeof groqApiKey === 'string' && !groqApiKey.includes('••••')) {
      process.env.GROQ_API_KEY = groqApiKey.trim();
    }
    if (openAiApiKey && typeof openAiApiKey === 'string' && !openAiApiKey.includes('••••')) {
      process.env.OPENAI_API_KEY = openAiApiKey.trim();
      process.env.AI_API_KEY = openAiApiKey.trim();
    }

    memorySettings = {
      ...memorySettings,
      ...otherSettings
    };

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        ...memorySettings,
        elevenLabsConfigured: ttsService.isConfigured(),
        groqConfigured: Boolean(process.env.GROQ_API_KEY),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        openAiConfigured: Boolean(process.env.OPENAI_API_KEY)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/settings/test-tts
// Test ElevenLabs speech synthesis
const testTTS = async (req, res) => {
  try {
    const { text, voiceId, apiKey } = req.body || {};
    const sampleText = text || 'Hello! This is TalkPilot AI speaking with a human voice powered by ElevenLabs.';

    // If temporary test API key provided
    const originalKey = process.env.ELEVENLABS_API_KEY;
    if (apiKey && !apiKey.includes('••••')) {
      process.env.ELEVENLABS_API_KEY = apiKey.trim();
    }

    try {
      const result = await ttsService.synthesizeSpeech({
        text: sampleText,
        voiceId: voiceId || ttsService.getDefaultVoiceId()
      });

      res.json(result);
    } finally {
      if (apiKey && originalKey !== undefined) {
        process.env.ELEVENLABS_API_KEY = originalKey;
      }
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/settings/test-ai
// Test AI text completion with custom user input
const testAI = async (req, res) => {
  try {
    const { message, systemPrompt } = req.body || {};
    const prompt = message || 'Hello, can you tell me what you can do?';

    const reply = await freeAiClient.generateReply({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: systemPrompt || 'You are TalkPilot AI, a warm and polite voice assistant. Respond naturally in 1-2 spoken sentences.',
      temperature: 0.7,
      maxTokens: 100
    });

    if (reply) {
      res.json({
        success: true,
        reply,
        provider: process.env.AI_PROVIDER || 'free'
      });
    } else {
      res.json({
        success: false,
        message: 'Could not generate AI reply with current configuration.'
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  testTTS,
  testAI
};
