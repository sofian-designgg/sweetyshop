const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Warning = require('../models/Warning');

module.exports = {
  name: 'warn',
  description: 'Avertir un membre',
  slashData: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Ajouter un avertissement')
    .addUserOption((o) =>
      o.setName('membre').setDescription('Membre').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('raison').setDescription('Raison').setRequired(false)
    ),
  async executeSlash(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: 'Permission **Modérer les membres** requise.',
        ephemeral: true,
      });
      return;
    }
    const user = interaction.options.getUser('membre', true);
    const reason =
      interaction.options.getString('raison') || 'Aucune raison fournie';
    await Warning.create({
      guildId: interaction.guildId,
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
    });
    await interaction.reply(`**${user.tag}** a été averti — ${reason}`);
  },
  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await message.reply('Permission **Modérer les membres** requise.');
      return;
    }
    const target = message.mentions.users?.first();
    if (!target) {
      await message.reply('Usage : `+warn @membre [raison]`');
      return;
    }
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    await Warning.create({
      guildId: message.guild.id,
      userId: target.id,
      moderatorId: message.author.id,
      reason,
    });
    await message.reply(`**${target.tag}** a été averti — ${reason}`);
  },
};
