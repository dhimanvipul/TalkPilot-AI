const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  speaker: { type: String, enum: ['AI', 'Customer', 'System'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const transcriptSchema = new mongoose.Schema(
  {
    callId: { type: mongoose.Schema.Types.ObjectId, ref: 'Call', required: true, unique: true, index: true },
    messages: [messageSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transcript', transcriptSchema);
