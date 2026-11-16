const express = require('express');
const router = express.Router();
const {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  duplicateAgent
} = require('../controllers/agentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getAgents)
  .post(createAgent);

router.route('/:id')
  .get(getAgentById)
  .put(updateAgent)
  .delete(deleteAgent);

router.post('/:id/duplicate', duplicateAgent);

module.exports = router;
