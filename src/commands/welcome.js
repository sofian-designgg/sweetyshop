const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getConfig, isConfigAdmin } = require('../util/permissions');
const { embedFromConfig } = require('../util/embeds');

module.exports = {
  name: 'welcome',
  description: 'Gérer le message de bienvenue',
  slashData: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configuration du message de bienvenue')
    .addSubcommand((s) =>
      s
        .setName('config')
        .setDescription('Activer/Désactiver et choisir le salon')
        .addBooleanOption((o) => o.setName('active').setDescription('Activer le message').setRequired(true))
        .addChannelOption((o) => o.setName('salon').setDescription('Salon de bienvenue').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('set-embed')
        .setDescription('Définir l’embed de bienvenue via JSON')
        .addStringOption((o) => o.setName('json').setDescription('JSON embed ({title, description, color, image, thumb...})').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('afficher').setDescription('Voir la config actuelle')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction) {
    const cfg = await getConfig(interaction.guildId);
    const sub = interaction.options.getSubcommand();

    const admin =
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      (await isConfigAdmin(interaction.member, cfg));
    if (!admin) {
      await interaction.reply({ content: 'Permission refusée.', ephemeral: true });
      return;
    }

    if (sub === 'config') {
      const active = interaction.options.getBoolean('active', true);
      const channel = interaction.options.getChannel('salon', true);

      if (!cfg.welcomeConfig) cfg.welcomeConfig = {};
      cfg.welcomeConfig.enabled = active;
      cfg.welcomeConfig.channelId = channel.id;
      
      cfg.markModified('welcomeConfig');
      await cfg.save();
      
      await interaction.reply({
        content: `Message de bienvenue ${active ? 'activé' : 'désactivé'} dans ${channel}.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === 'set-embed') {
      let rawJson = interaction.options.getString('json', true).trim();
      if (rawJson.startsWith("'") && rawJson.endsWith("'")) rawJson = rawJson.slice(1, -1);
      if (rawJson.startsWith("`") && rawJson.endsWith("`")) rawJson = rawJson.slice(1, -1);

      try {
        const parsed = JSON.parse(rawJson);
        if (!cfg.welcomeConfig) cfg.welcomeConfig = {};
        cfg.welcomeConfig.embed = parsed;
        cfg.markModified('welcomeConfig');
        await cfg.save();
        await interaction.reply({
          content: '✅ Embed de bienvenue mis à jour. Testez avec l’arrivée d’un nouveau membre !',
          ephemeral: true,
        });
      } catch (e) {
        await interaction.reply({ 
          content: `❌ **JSON invalide.**\nErreur : \`${e.message}\``, 
          ephemeral: true 
        });
      }
      return;
    }

    if (sub === 'afficher') {
      const w = cfg.welcomeConfig || {};
      const embed = new EmbedBuilder()
        .setTitle('Config Bienvenue')
        .setColor(0x5865f2)
        .addFields(
          { name: 'Activé', value: w.enabled ? 'Oui' : 'Non', inline: true },
          { name: 'Salon', value: w.channelId ? `<#${w.channelId}>` : 'Aucun', inline: true }
        );
      
      if (w.embed) {
        const preview = embedFromConfig(w.embed);
        await interaction.reply({ content: 'Voici la configuration actuelle :', embeds: [embed, preview], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },
};
