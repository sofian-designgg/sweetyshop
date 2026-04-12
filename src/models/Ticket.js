const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    categoryId: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    closedAt: Date,
    closedBy: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', TicketSchema);
