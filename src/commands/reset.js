const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, isConfigAdmin } = require('../util/permissions');

module.exports = {
  name: 'reset',
  description: 'Réinitialiser les boutons de tickets (test)',
  slashData: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Réinitialiser les boutons de tickets (supprime tout)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction) {
    const cfg = await getConfig(interaction.guildId);
    const admin =
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      (await isConfigAdmin(interaction.member, cfg));

    if (!admin) {
      await interaction.reply({ content: 'Permission refusée.', ephemeral: true });
      return;
    }

    cfg.ticketCategories = [];
    cfg.ticketPanelEmbed = {
      title: 'Support',
      description: 'Panel réinitialisé. Ajoutez des boutons via /ticket bouton-ajouter.',
      color: 0x5865f2
    };
    cfg.markModified('ticketCategories');
    cfg.markModified('ticketPanelEmbed');
    await cfg.save();

    await interaction.reply({
      content: '✅ Tout le système de tickets a été vidé de A à Z. Utilisez `/ticket panel-envoyer` pour afficher le nouveau panel vierge.',
      ephemeral: true,
    });
  },

  async executePrefix(message, args, { cfg }) {
    const admin =
      message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      (await isConfigAdmin(message.member, cfg));

    if (!admin) return;

    cfg.ticketCategories = [];
    cfg.ticketPanelEmbed = {
      title: 'Support',
      description: 'Panel réinitialisé.',
      color: 0x5865f2
    };
    cfg.markModified('ticketCategories');
    cfg.markModified('ticketPanelEmbed');
    await cfg.save();

    await message.reply('✅ Système vidé. Relance le panel avec `/ticket panel-envoyer`.');
  },
};
