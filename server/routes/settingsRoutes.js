const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  testTTS,
  testAI
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

router.post('/test-tts', testTTS);
router.post('/test-ai', testAI);

module.exports = router;
