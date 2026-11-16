const express = require('express');
const router = express.Router();
const {
  getCalls,
  getCallById,
  initiateSingleCall,
  acceptCall,
  declineCall,
  sendCallMessage,
  endCall
} = require('../controllers/callController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getCalls);
router.post('/initiate', initiateSingleCall);
router.get('/:id', getCallById);
router.post('/:id/accept', acceptCall);
router.post('/:id/decline', declineCall);
router.post('/:id/message', sendCallMessage);
router.post('/:id/end', endCall);

module.exports = router;
