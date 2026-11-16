const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAgent', required: true },
    contactIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    campaignObjective: { type: String, default: '' },
    agentRole: { type: String, default: '' },
    systemInstructions: { type: String, default: '' },
    contextInfo: { type: String, default: '' },
    greetingMessage: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Running', 'Paused', 'Completed', 'Cancelled'],
      default: 'Draft',
      index: true
    },
    scheduleTime: { type: Date, default: null },
    retryAttempts: { type: Number, default: 2 },
    retryDelay: { type: Number, default: 300 }, // seconds
    concurrencyLimit: { type: Number, default: 3 },
    callInterval: { type: Number, default: 5 }, // seconds between dispatching calls
    stats: {
      totalContacts: { type: Number, default: 0 },
      queued: { type: Number, default: 0 },
      calling: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      noAnswer: { type: Number, default: 0 },
      busy: { type: Number, default: 0 },
      optedOut: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
