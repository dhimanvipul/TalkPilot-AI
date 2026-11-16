const Call = require('../models/Call');
const Transcript = require('../models/Transcript');
const Contact = require('../models/Contact');
const AIAgent = require('../models/AIAgent');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const telephonyProvider = require('../services/telephony/telephonyProvider');

// GET /api/calls
const getCalls = async (req, res) => {
  try {
    const { search, campaignId, agentId, status, outcome, page = 1, limit = 50 } = req.query;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    const baseFilter = {
      $or: [
        { userId: req.user.id },
        { recipientUserId: req.user.id },
        ...(userEmail ? [{ recipientEmail: userEmail }] : [])
      ]
    };

    const query = { ...baseFilter };

    if (campaignId) query.campaignId = campaignId;
    if (agentId) query.agentId = agentId;
    if (status) query.status = status;
    if (outcome) query.outcome = outcome;
    if (search) {
      query.phone = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Call.countDocuments(query);

    const calls = await Call.find(query)
      .populate('contactId', 'name phone email optOutStatus')
      .populate('agentId', 'name voice personality')
      .populate('campaignId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: calls.length,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      calls
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/calls/:id
const getCallById = async (req, res) => {
  try {
    const userEmail = (req.user.email || '').toLowerCase().trim();
    const call = await Call.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user.id },
        { recipientUserId: req.user.id },
        ...(userEmail ? [{ recipientEmail: userEmail }] : [])
      ]
    })
      .populate('contactId')
      .populate('agentId')
      .populate('campaignId');

    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    const transcript = await Transcript.findOne({ callId: call._id });

    res.json({
      success: true,
      call,
      transcript: transcript ? transcript.messages : []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/calls/initiate
const initiateSingleCall = async (req, res) => {
  try {
    const { contactId, agentId, campaignId } = req.body;
    if (!contactId || !agentId) {
      return res.status(400).json({ success: false, message: 'Contact ID and Agent ID are required' });
    }

    const contact = await Contact.findOne({ _id: contactId, userId: req.user.id });
    const agent = await AIAgent.findOne({ _id: agentId, userId: req.user.id });
    const campaign = campaignId ? await Campaign.findOne({ _id: campaignId, userId: req.user.id }) : null;

    if (!contact || !agent) {
      return res.status(404).json({ success: false, message: 'Contact or Agent not found' });
    }

    if (contact.optOutStatus || !contact.consentStatus) {
      return res.status(400).json({
        success: false,
        message: 'Cannot call contact: Marked as DO NOT CALL or Opted-out'
      });
    }

    let recipientUserId = null;
    let recipientEmail = contact.email ? contact.email.toLowerCase().trim() : '';

    if (recipientEmail) {
      const targetUser = await User.findOne({ email: recipientEmail });
      if (targetUser) {
        recipientUserId = targetUser._id;
      }
    }

    const call = new Call({
      userId: req.user.id,
      recipientUserId,
      recipientEmail,
      callerName: req.user.name || '',
      callerEmail: req.user.email || '',
      campaignId: campaign?._id || null,
      agentId: agent._id,
      contactId: contact._id,
      phone: contact.phone,
      status: 'Queued',
      callingMode: process.env.CALLING_MODE || 'mock',
      provider: process.env.CALLING_MODE === 'real' ? 'twilio' : 'mock'
    });
    await call.save();

    const io = req.app.get('io');

    try {
      await telephonyProvider.initiateCall({ call, agent, contact, campaign, io, caller: req.user });
      res.status(201).json({
        success: true,
        message: 'Call initiated successfully',
        call
      });
    } catch (err) {
      console.error('Error initiating single call:', err.message);
      res.status(400).json({
        success: false,
        message: err.message || 'Call initiation failed',
        call
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/calls/:id/accept
const acceptCall = async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await telephonyProvider.acceptCall(req.params.id, io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/calls/:id/decline
const declineCall = async (req, res) => {
  try {
    const io = req.app.get('io');
    const reason = req.body?.reason || 'Declined by recipient';
    const result = await telephonyProvider.declineCall(req.params.id, io, reason);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/calls/:id/message
const sendCallMessage = async (req, res) => {
  try {
    const io = req.app.get('io');
    const { text } = req.body;
    const result = await telephonyProvider.handleCustomerMessage(req.params.id, text, io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/calls/:id/end
const endCall = async (req, res) => {
  try {
    const io = req.app.get('io');
    const result = await telephonyProvider.endCall(req.params.id, io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getCalls,
  getCallById,
  initiateSingleCall,
  acceptCall,
  declineCall,
  sendCallMessage,
  endCall
};
