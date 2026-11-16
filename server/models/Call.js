const mongoose = require('mongoose');

const callSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    recipientEmail: { type: String, default: '', index: true },
    callerName: { type: String, default: '' },
    callerEmail: { type: String, default: '' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAgent', required: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    phone: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: [
        'Queued',
        'Initiating',
        'Ringing',
        'Connected',
        'In Progress',
        'Completed',
        'Failed',
        'No Answer',
        'Busy',
        'Cancelled',
        'Opted Out'
      ],
      default: 'Queued',
      index: true
    },
    callingMode: { type: String, enum: ['mock', 'real'], default: 'mock' },
    provider: { type: String, default: 'mock' },
    providerCallId: { type: String, default: null },
    telephonyCallSid: { type: String, default: null },
    fromNumber: { type: String, default: '' },
    toNumber: { type: String, default: '' },
    lastError: { type: String, default: '' },
    lastWebhookReceivedAt: { type: Date, default: null },
    lastWebhookStatus: { type: String, default: '' },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    duration: { type: Number, default: 0 }, // seconds
    retryCount: { type: Number, default: 0 },
    outcome: {
      type: String,
      enum: [
        'Pending',
        'Interested',
        'Not Interested',
        'Appointment Confirmed',
        'Callback Requested',
        'Wrong Number',
        'No Answer',
        'Busy',
        'Completed',
        'Opted Out',
        'Failed'
      ],
      default: 'Pending'
    },
    summary: { type: String, default: '' },
    intent: { type: String, default: '' },
    actionRequired: { type: String, default: '' },
    recordingUrl: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Call', callSchema);
