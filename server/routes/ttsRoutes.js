const express = require('express');
const router = express.Router();
const ttsService = require('../services/audio/ttsService');

// POST /api/tts/synthesize
// Body: { text, voiceId, modelId, voiceSettings }
router.post('/synthesize', async (req, res) => {
  try {
    const { text, voiceId, modelId, voiceSettings } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Text is required for TTS synthesis' });
    }

    const result = await ttsService.synthesizeSpeech({
      text,
      voiceId,
      modelId,
      voiceSettings
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tts/audio/:id.mp3
// Streams the cached MP3 audio buffer
router.get('/audio/:id', (req, res) => {
  try {
    const audioData = ttsService.getAudio(req.params.id);
    if (!audioData) {
      return res.status(404).send('Audio not found or expired');
    }

    res.set({
      'Content-Type': audioData.contentType || 'audio/mpeg',
      'Content-Length': audioData.buffer.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400'
    });

    res.send(audioData.buffer);
  } catch (err) {
    res.status(500).send('Error streaming audio');
  }
});

// GET /api/tts/voices
router.get('/voices', async (req, res) => {
  try {
    const voices = await ttsService.getVoices();
    res.json({
      success: true,
      isConfigured: ttsService.isConfigured(),
      voices
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tts/status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    isConfigured: ttsService.isConfigured(),
    defaultVoiceId: ttsService.getDefaultVoiceId(),
    cacheEntries: ttsService.audioCache.size
  });
});

module.exports = router;
