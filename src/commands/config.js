const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configuration du serveur')
    .addSubcommand(sub =>
      sub.setName('voir')
        .setDescription('Voir la configuration actuelle')
    )
    .addSubcommand(sub =>
      sub.setName('panel-embed')
        .setDescription('Configurer l\'embed du panel')
        .addStringOption(opt => opt.setName('titre').setDescription('Titre du panel'))
        .addStringOption(opt => opt.setName('description').setDescription('Description du panel'))
        .addIntegerOption(opt => opt.setName('couleur').setDescription('Couleur (hex, ex: 0x5865f2)'))
        .addStringOption(opt => opt.setName('image').setDescription('URL de l\'image'))
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ Permission **Gérer le serveur** requise.',
        flags: MessageFlags.Ephemeral
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const cfg = await getConfig(interaction.guild.id);

    try {
      if (subcommand === 'voir') {
        const embed = new EmbedBuilder()
          .setTitle('⚙️ Configuration')
          .setColor(0x5865f2)
          .addFields(
            { 
              name: '🎫 Tickets', 
              value: `Catégories: ${cfg.ticketCategories?.length || 0}\n` +
                     `Salon panel: ${cfg.ticketPanelChannelId ? `<#${cfg.ticketPanelChannelId}>` : 'Non défini'}\n` +
                     `Catégorie: ${cfg.ticketCategoryId ? `<#${cfg.ticketCategoryId}>` : 'Non définie'}`,
              inline: false
            },
            {
              name: '💱 Exchanger',
              value: cfg.exchangerConfig?.enabled ? '✅ Activé' : '❌ Désactivé',
              inline: false
            }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
      
      else if (subcommand === 'panel-embed') {
        if (!cfg.ticketPanelEmbed) cfg.ticketPanelEmbed = {};
        
        const titre = interaction.options.getString('titre');
        const description = interaction.options.getString('description');
        const couleur = interaction.options.getInteger('couleur');
        const image = interaction.options.getString('image');
        
        if (titre) cfg.ticketPanelEmbed.title = titre;
        if (description) {
          // Convertir \n en vrais sauts de ligne
          cfg.ticketPanelEmbed.description = description.replace(/\\n/g, '\n');
        }
        if (couleur !== null) cfg.ticketPanelEmbed.color = couleur;
        if (image) cfg.ticketPanelEmbed.image = image;
        
        await cfg.save();
        
        await interaction.reply({
          content: '✅ Configuration de l\'embed mise à jour.\nUtilise `/ticket panel-envoyer` pour appliquer.',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error) {
      console.error('[Config]', error);
      await interaction.reply({
        content: `❌ Erreur: ${error.message}`,
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
};
