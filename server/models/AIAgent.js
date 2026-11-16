const mongoose = require('mongoose');

const aiAgentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    systemInstructions: { type: String, required: true },
    greetingMessage: { type: String, required: true },
    personality: { type: String, default: 'Professional & Polite' },
    language: { type: String, default: 'en-US' },
    voice: { type: String, default: 'en-US-Neural2-F' },
    callObjective: { type: String, required: true },
    endingMessage: { type: String, default: 'Thank you for your time. Have a great day!' },
    maxDuration: { type: Number, default: 300 }, // seconds
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    totalCalls: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AIAgent', aiAgentSchema);
