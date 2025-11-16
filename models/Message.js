const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, trim: true },
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: 'createdAt' } }
);

module.exports = mongoose.model('Message', messageSchema);
