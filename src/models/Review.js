const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    stars: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    orderRef: { type: String, default: '' },
    ticketChannelId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', ReviewSchema);
