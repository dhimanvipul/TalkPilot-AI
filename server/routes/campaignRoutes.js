const express = require('express');
const router = express.Router();
const {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign
} = require('../controllers/campaignController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getCampaigns)
  .post(createCampaign);

router.route('/:id')
  .get(getCampaignById)
  .put(updateCampaign);

router.post('/:id/start', startCampaign);
router.post('/:id/pause', pauseCampaign);
router.post('/:id/resume', resumeCampaign);
router.post('/:id/stop', stopCampaign);

module.exports = router;
