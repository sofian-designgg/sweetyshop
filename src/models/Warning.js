const mongoose = require('mongoose');

const WarningSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, default: 'Aucune raison' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Warning', WarningSchema);
