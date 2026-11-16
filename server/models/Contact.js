const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, default: '' },
    tags: [{ type: String }],
    notes: { type: String, default: '' },
    consentStatus: { type: Boolean, default: true },
    optOutStatus: { type: Boolean, default: false }
  },
  { timestamps: true }
);

contactSchema.index({ userId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);
