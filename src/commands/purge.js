const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'purge',
  aliases: ['clear', 'prune'],
  description: 'Supprimer des messages en masse',
  slashData: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Supprimer jusqu’à 100 messages')
    .addIntegerOption((o) =>
      o
        .setName('nombre')
        .setDescription('Nombre de messages (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),
  async executeSlash(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: 'Permission **Gérer les messages** requise.',
        ephemeral: true,
      });
      return;
    }
    const n = interaction.options.getInteger('nombre', true);
    const deleted = await interaction.channel.bulkDelete(n, true).catch(() => null);
    if (!deleted) {
      await interaction.reply({
        content: 'Échec (messages > 14 jours ou permissions).',
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({
      content: `**${deleted.size}** message(s) supprimé(s).`,
      ephemeral: true,
    });
  },
  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await message.reply('Permission **Gérer les messages** requise.');
      return;
    }
    const n = parseInt(args[0], 10);
    if (Number.isNaN(n) || n < 1 || n > 100) {
      await message.reply('Usage : `+purge <1-100>`');
      return;
    }
    const deleted = await message.channel.bulkDelete(n, true).catch(() => null);
    if (!deleted) {
      await message.reply('Échec (messages > 14 jours ou permissions).');
      return;
    }
    await message.reply(`**${deleted.size}** message(s) supprimé(s).`).then((m) => {
      setTimeout(() => m.delete().catch(() => {}), 4000);
    });
  },
};
