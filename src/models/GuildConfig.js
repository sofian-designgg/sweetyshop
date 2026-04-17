const mongoose = require('mongoose');

const TicketCategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    emoji: { type: String, default: '' },
    prompt: { type: String, default: '' },
    hint: { type: String, default: 'Appuie sur le bouton pour ouvrir un ticket.' },
    row: { type: Number, default: 0, min: 0, max: 4 },
    style: {
      type: String,
      enum: ['Primary', 'Secondary', 'Success', 'Danger'],
      default: 'Secondary',
    },
  },
  { _id: false }
);

const EmbedFieldSchema = new mongoose.Schema(
  {
    name: { type: String, default: '\u200b' },
    value: { type: String, default: '\u200b' },
    inline: { type: Boolean, default: false },
  },
  { _id: false }
);

const CustomEmbedSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    color: Number,
    image: String,
    thumbnail: String,
    footer: String,
    fields: [EmbedFieldSchema],
  },
  { _id: false }
);

const GuildConfigSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '+' },
    ticketCategoryId: String,
    ticketPanelChannelId: String,
    ticketPanelMessageId: String,
    ticketStaffRoleIds: [String],
    ticketWelcomeEmbed: CustomEmbedSchema,
    modLogChannelId: String,
    reviewChannelId: String,
    reviewRequestEmbed: CustomEmbedSchema,
    ticketPanelEmbed: CustomEmbedSchema,
    ticketCategories: { type: [TicketCategorySchema], default: [] },
    paymentEmbeds: { type: mongoose.Schema.Types.Mixed, default: {} },
    modAdminRoleIds: [String],
    ticketMaxPerUser: { type: Number, default: 3 },
    ticketTranscriptChannelId: String,
    products: { type: Map, of: Number, default: {} },
    exchangerConfig: {
      type: {
        channelId: String,
        messageId: String,
        rates: { type: Map, of: Number, default: {} }, // ex: "paypal-ltc": 0.95
        embed: CustomEmbedSchema,
      },
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
