const express = require('express');
const router = express.Router();
const {
  handleTelephonyStatus,
  handleTelephonyVoice,
  handleTelephonyRespond,
  handleTelephonyRecording,
  handleTelephonyAudio
} = require('../controllers/webhookController');

router.post('/telephony/status', handleTelephonyStatus);
router.post('/telephony/voice', handleTelephonyVoice);
router.post('/telephony/respond', handleTelephonyRespond);
router.post('/telephony/recording', handleTelephonyRecording);
router.post('/telephony/audio', handleTelephonyAudio);

module.exports = router;
