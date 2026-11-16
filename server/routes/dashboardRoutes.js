const express = require('express');
const router = express.Router();
const { getStats, getRecentCalls } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getStats);
router.get('/recent-calls', getRecentCalls);

module.exports = router;
