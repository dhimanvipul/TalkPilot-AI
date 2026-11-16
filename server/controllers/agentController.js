const AIAgent = require('../models/AIAgent');

// GET /api/agents
const getAgents = async (req, res) => {
  try {
    let agents = await AIAgent.find({ userId: req.user.id }).sort({ createdAt: -1 });

    if (agents.length === 0) {
      const defaultAgent = await AIAgent.create({
        userId: req.user.id,
        name: 'PIET Admissions Officer',
        description: 'Interactive AI admissions counselor pitching Panipat Institute of Engineering and Technology (PIET).',
        systemInstructions:
          'You are an engaging admissions counselor for Panipat Institute of Engineering and Technology (PIET), Delhi NCR. Highlight NAAC A+ accreditation, top placements up to 38 LPA, Apple labs, and up to 100% scholarships. Ask questions in between to keep the dialogue interactive.',
        greetingMessage:
          'Hello! This is Priya from the Admissions Office at PIET - Panipat Institute of Engineering and Technology. I am calling to discuss your higher education and admission opportunities for the 2026 session. Am I speaking with you?',
        personality: 'Enthusiastic & Informative',
        language: 'en-US',
        voice: 'en-US-Neural2-F (Female)',
        callObjective: 'Pitch PIET admissions, discuss B.Tech/CSE/Management programs, answer student queries, and schedule counseling.',
        endingMessage: 'Thank you for your time! We look forward to seeing you at PIET campus. Have a wonderful day!',
        maxDuration: 300,
        totalCalls: 0,
        successRate: 100
      });
      agents = [defaultAgent];
    }

    res.json({ success: true, count: agents.length, agents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/agents/:id
const getAgentById = async (req, res) => {
  try {
    const agent = await AIAgent.findOne({ _id: req.params.id, userId: req.user.id });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    res.json({ success: true, agent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/agents
const createAgent = async (req, res) => {
  try {
    const {
      name,
      description,
      systemInstructions,
      greetingMessage,
      personality,
      language,
      voice,
      callObjective,
      endingMessage,
      maxDuration
    } = req.body;

    if (!name || !systemInstructions || !greetingMessage || !callObjective) {
      return res.status(400).json({
        success: false,
        message: 'Name, System Instructions, Greeting Message, and Call Objective are required'
      });
    }

    const agent = await AIAgent.create({
      userId: req.user.id,
      name,
      description: description || '',
      systemInstructions,
      greetingMessage,
      personality: personality || 'Professional & Polite',
      language: language || 'en-US',
      voice: voice || 'en-US-Neural2-F',
      callObjective,
      endingMessage: endingMessage || 'Thank you for your time. Have a great day!',
      maxDuration: maxDuration ? parseInt(maxDuration, 10) : 300
    });

    res.status(201).json({ success: true, agent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/agents/:id
const updateAgent = async (req, res) => {
  try {
    const agent = await AIAgent.findOne({ _id: req.params.id, userId: req.user.id });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    const updated = await AIAgent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, agent: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/agents/:id
const deleteAgent = async (req, res) => {
  try {
    const agent = await AIAgent.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/agents/:id/duplicate
const duplicateAgent = async (req, res) => {
  try {
    const existing = await AIAgent.findOne({ _id: req.params.id, userId: req.user.id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    const duplicated = await AIAgent.create({
      userId: req.user.id,
      name: `${existing.name} (Copy)`,
      description: existing.description,
      systemInstructions: existing.systemInstructions,
      greetingMessage: existing.greetingMessage,
      personality: existing.personality,
      language: existing.language,
      voice: existing.voice,
      callObjective: existing.callObjective,
      endingMessage: existing.endingMessage,
      maxDuration: existing.maxDuration,
      status: 'active'
    });

    res.status(201).json({ success: true, agent: duplicated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  duplicateAgent
};
