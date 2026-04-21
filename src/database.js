const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('[MongoDB] Connecté avec succès');
  } catch (error) {
    console.error('[MongoDB] Erreur de connexion:', error);
    process.exit(1);
  }
}

// Schéma Config
const configSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  
  // Tickets
  ticketCategoryId: String,
  ticketPanelChannelId: String,
  ticketPanelMessageId: String,
  ticketStaffRoleIds: [String],
  ticketCategories: [{
    id: String,
    label: String,
    emoji: String,
    style: { type: String, default: 'Secondary' },
    prompt: String,
    hint: String,
    row: { type: Number, default: 0 },
  }],
  ticketPanelEmbed: {
    title: { type: String, default: '🎫 Support' },
    description: String,
    color: { type: Number, default: 0x5865f2 },
    image: String,
    footer: String,
  },
  
  // Exchanger
  exchangerConfig: {
    enabled: { type: Boolean, default: false },
    rates: mongoose.Schema.Types.Mixed,
    embed: {
      title: String,
      description: String,
      color: Number,
    },
  },
  
  // Admin roles
  adminRoleIds: [String],
}, { timestamps: true });

const Config = mongoose.model('Config', configSchema);

// Schéma Ticket
const ticketSchema = new mongoose.Schema({
  guildId: String,
  channelId: { type: String, unique: true },
  userId: String,
  category: String,
  status: { type: String, default: 'open' },
  createdAt: { type: Date, default: Date.now },
  closedAt: Date,
  closedBy: String,
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = { connectDB, Config, Ticket };
