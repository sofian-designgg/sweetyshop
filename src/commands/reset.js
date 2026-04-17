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
    cfg.markModified('ticketCategories');
    await cfg.save();

    await interaction.reply({
      content: '✅ Tous les boutons de tickets ont été supprimés. Utilisez `/ticket panel-envoyer` pour rafraîchir le panel.',
      ephemeral: true,
    });
  },

  async executePrefix(message, args, { cfg }) {
    const admin =
      message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      (await isConfigAdmin(message.member, cfg));

    if (!admin) return;

    cfg.ticketCategories = [];
    cfg.markModified('ticketCategories');
    await cfg.save();

    await message.reply('✅ Boutons réinitialisés. Relance le panel avec `+ticket envoyer`.');
  },
};
