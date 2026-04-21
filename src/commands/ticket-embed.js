const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { getConfig } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-embed')
    .setDescription('Créer le panel de tickets avec un builder interactif')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName('salon')
        .setDescription('Salon où envoyer le panel')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');
    
    // Stocker le channel ID pour l'étape suivante
    interaction.client.tempTicketChannel = channel.id;
    
    // Créer le modal pour l'embed
    const modal = new ModalBuilder()
      .setCustomId('ticket_embed_builder')
      .setTitle('Créer le panel de tickets');

    // Champ: Titre
    const titleInput = new TextInputBuilder()
      .setCustomId('embed_title')
      .setLabel('Titre du panel')
      .setPlaceholder('Ex: 🎫 Système de Tickets')
      .setStyle(TextInputStyle.Short)
      .setValue('🎫 Système de Tickets')
      .setRequired(true);

    // Champ: Description (paragraphe entier)
    const descInput = new TextInputBuilder()
      .setCustomId('embed_description')
      .setLabel('Description (utilise Shift+Enter pour saut de ligne)')
      .setPlaceholder('Décris ton système de tickets ici...')
      .setStyle(TextInputStyle.Paragraph)
      .setValue('Bienvenue dans notre système de support.\n\nSélectionne le type de ticket approprié dans le menu ci-dessous.')
      .setRequired(true)
      .setMaxLength(4000);

    // Champ: Couleur
    const colorInput = new TextInputBuilder()
      .setCustomId('embed_color')
      .setLabel('Couleur (hex)')
      .setPlaceholder('Ex: #5865f2 ou #1FFFBF')
      .setStyle(TextInputStyle.Short)
      .setValue('#1FFFBF')
      .setRequired(false);

    // Champ: Footer
    const footerInput = new TextInputBuilder()
      .setCustomId('embed_footer')
      .setLabel('Footer texte')
      .setPlaceholder('Ex: Merci de patienter...')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    // Champ: Image URL
    const imageInput = new TextInputBuilder()
      .setCustomId('embed_image')
      .setLabel('URL image (optionnel)')
      .setPlaceholder('https://...')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    // Ajouter les champs au modal
    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(descInput);
    const row3 = new ActionRowBuilder().addComponents(colorInput);
    const row4 = new ActionRowBuilder().addComponents(footerInput);
    const row5 = new ActionRowBuilder().addComponents(imageInput);

    modal.addComponents(row1, row2, row3, row4, row5);

    await interaction.showModal(modal);
  },
};
