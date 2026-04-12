const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'timeout',
  aliases: ['mute', 'to'],
  description: 'Exclure temporairement (timeout Discord)',
  slashData: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout un membre')
    .addUserOption((o) =>
      o.setName('membre').setDescription('Membre').setRequired(true)
    )
    .addIntegerOption((o) =>
      o
        .setName('minutes')
        .setDescription('Durée en minutes (1-40320)')
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
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
    const minutes = interaction.options.getInteger('minutes', true);
    const reason =
      interaction.options.getString('raison') || 'Aucune raison fournie';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
      return;
    }
    if (!member.moderatable) {
      await interaction.reply({ content: 'Je ne peux pas timeout ce membre.', ephemeral: true });
      return;
    }
    await member.timeout(minutes * 60 * 1000, reason);
    await interaction.reply(
      `**${user.tag}** est en timeout **${minutes}** min — ${reason}`
    );
  },
  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await message.reply('Permission **Modérer les membres** requise.');
      return;
    }
    const target = message.mentions.members?.first();
    const minutes = parseInt(args[1], 10);
    if (!target || Number.isNaN(minutes)) {
      await message.reply('Usage : `+timeout @membre <minutes> [raison]`');
      return;
    }
    if (!target.moderatable) {
      await message.reply('Je ne peux pas timeout ce membre.');
      return;
    }
    const reason = args.slice(2).join(' ') || 'Aucune raison fournie';
    await target.timeout(minutes * 60 * 1000, reason);
    await message.reply(
      `**${target.user.tag}** est en timeout **${minutes}** min — ${reason}`
    );
  },
};
