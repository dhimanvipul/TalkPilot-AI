const Campaign = require('../models/Campaign');
const AIAgent = require('../models/AIAgent');
const callingEngine = require('../services/calling/callingEngine');

// GET /api/campaigns
const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.user.id })
      .populate('agentId', 'name personality voice')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/campaigns/:id
const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('agentId')
      .populate('contactIds');
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/campaigns
const createCampaign = async (req, res) => {
  try {
    const {
      name,
      agentId,
      contactIds,
      scheduleTime,
      retryAttempts,
      concurrencyLimit,
      callInterval,
      campaignObjective,
      agentRole,
      systemInstructions,
      contextInfo,
      greetingMessage
    } = req.body;

    if (!name || !agentId || !contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Campaign Name, Agent ID, and at least one Contact are required'
      });
    }

    const linkedAgent = await AIAgent.findById(agentId);
    const cleanName = name.trim();

    // Determine smart campaign defaults if custom instructions were not manually passed
    let finalObjective = (campaignObjective || '').trim();
    let finalRole = (agentRole || '').trim();
    let finalInstructions = (systemInstructions || '').trim();
    let finalContext = (contextInfo || '').trim();
    let finalGreeting = (greetingMessage || '').trim();

    if (!finalObjective) {
      if (cleanName.toLowerCase().includes('diwali')) {
        finalObjective = 'Invite guests to the Diwali Party celebration, share event details, answer questions, and confirm attendance.';
      } else if (linkedAgent && linkedAgent.callObjective && (cleanName.toLowerCase().includes('piet') || cleanName.toLowerCase().includes('admission'))) {
        finalObjective = linkedAgent.callObjective;
      } else {
        finalObjective = `Outreach and voice interaction for ${cleanName}.`;
      }
    }

    if (!finalRole) {
      if (cleanName.toLowerCase().includes('diwali')) {
        finalRole = 'Diwali Party Invitation Assistant - warm, joyful, festive, and welcoming';
      } else if (linkedAgent && linkedAgent.personality && (cleanName.toLowerCase().includes('piet') || cleanName.toLowerCase().includes('admission'))) {
        finalRole = linkedAgent.personality;
      } else {
        finalRole = `${cleanName} Voice Assistant - polite, clear, and professional`;
      }
    }

    if (!finalInstructions) {
      if (cleanName.toLowerCase().includes('diwali')) {
        finalInstructions =
          'You are the Diwali Party Invitation Assistant. Introduce the upcoming Diwali party celebration, share festive greetings, explain that there will be music, traditional dinner, sweets, and celebration, ask if the guest is interested in attending, answer their questions, and confirm their RSVP attendance. Never talk about college admissions or PIET.';
      } else if (linkedAgent && linkedAgent.systemInstructions && (cleanName.toLowerCase().includes('piet') || cleanName.toLowerCase().includes('admission'))) {
        finalInstructions = linkedAgent.systemInstructions;
      } else {
        finalInstructions = `You are the AI assistant for ${cleanName}. Speak politely, explain the purpose of the call, answer customer inquiries clearly, and help achieve the objective: ${finalObjective}. Never discuss college admissions or unrelated topics.`;
      }
    }

    if (!finalGreeting) {
      if (cleanName.toLowerCase().includes('diwali')) {
        finalGreeting = 'Hi {name}! Wishing you a joyful festive season. I am calling with a special invitation to our Diwali Party celebration. Do you have a quick moment?';
      } else if (linkedAgent && linkedAgent.greetingMessage && (cleanName.toLowerCase().includes('piet') || cleanName.toLowerCase().includes('admission'))) {
        finalGreeting = linkedAgent.greetingMessage;
      } else {
        finalGreeting = `Hello {name}! This is the ${cleanName} team calling. Do you have a moment to speak?`;
      }
    }

    if (!finalContext && cleanName.toLowerCase().includes('diwali')) {
      finalContext = 'Diwali celebration with family, lights, traditional dinner buffet, fun activities, and festive entertainment.';
    }

    const campaign = await Campaign.create({
      userId: req.user.id,
      name: cleanName,
      agentId,
      contactIds,
      campaignObjective: finalObjective,
      agentRole: finalRole,
      systemInstructions: finalInstructions,
      contextInfo: finalContext,
      greetingMessage: finalGreeting,
      scheduleTime: scheduleTime || null,
      retryAttempts: retryAttempts ? parseInt(retryAttempts, 10) : 2,
      concurrencyLimit: concurrencyLimit ? parseInt(concurrencyLimit, 10) : 3,
      callInterval: callInterval ? parseInt(callInterval, 10) : 3,
      status: scheduleTime ? 'Scheduled' : 'Draft',
      stats: {
        totalContacts: contactIds.length,
        queued: contactIds.length,
        calling: 0,
        completed: 0,
        failed: 0,
        noAnswer: 0,
        busy: 0,
        optedOut: 0
      }
    });

    res.status(201).json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/campaigns/:id
const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user.id });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const updated = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, campaign: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/campaigns/:id/start
const startCampaign = async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await callingEngine.startCampaignQueue(req.params.id, io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/campaigns/:id/pause
const pauseCampaign = async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await callingEngine.pauseCampaignQueue(req.params.id, io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/campaigns/:id/resume
const resumeCampaign = async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await callingEngine.resumeCampaignQueue(req.params.id, io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/campaigns/:id/stop
const stopCampaign = async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await callingEngine.stopCampaignQueue(req.params.id, io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign
};
