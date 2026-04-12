const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'ban',
  description: 'Bannir un membre',
  slashData: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre')
    .addUserOption((o) =>
      o.setName('membre').setDescription('Membre').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('raison').setDescription('Raison').setRequired(false)
    )
    .addIntegerOption((o) =>
      o
        .setName('jours_messages')
        .setDescription('Supprimer messages (0-7 jours)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),
  async executeSlash(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({ content: 'Permission **Bannir** requise.', ephemeral: true });
      return;
    }
    const user = interaction.options.getUser('membre', true);
    const reason =
      interaction.options.getString('raison') || 'Aucune raison fournie';
    const days = interaction.options.getInteger('jours_messages') ?? 0;
    const me = interaction.guild.members.me;
    if (user.id === interaction.guild.ownerId || user.id === me?.id) {
      await interaction.reply({ content: 'Impossible de bannir cette cible.', ephemeral: true });
      return;
    }
    await interaction.guild.members.ban(user, {
      deleteMessageSeconds: days * 24 * 60 * 60,
      reason,
    });
    await interaction.reply(`**${user.tag}** a été banni — ${reason}`);
  },
  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      await message.reply('Permission **Bannir** requise.');
      return;
    }
    const target = message.mentions.members?.first();
    if (!target) {
      await message.reply('Usage : `+ban @membre [raison]`');
      return;
    }
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    if (!target.bannable) {
      await message.reply('Je ne peux pas bannir ce membre.');
      return;
    }
    await target.ban({ reason });
    await message.reply(`**${target.user.tag}** a été banni — ${reason}`);
  },
};
