const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'kick',
  description: 'Expulser un membre',
  slashData: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser un membre')
    .addUserOption((o) =>
      o.setName('membre').setDescription('Membre').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('raison').setDescription('Raison').setRequired(false)
    ),
  async executeSlash(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({ content: 'Permission **Expulser** requise.', ephemeral: true });
      return;
    }
    const user = interaction.options.getUser('membre', true);
    const reason =
      interaction.options.getString('raison') || 'Aucune raison fournie';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
      return;
    }
    if (!member.kickable) {
      await interaction.reply({ content: 'Je ne peux pas expulser ce membre.', ephemeral: true });
      return;
    }
    await member.kick(reason);
    await interaction.reply(`**${user.tag}** a été expulsé — ${reason}`);
  },
  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      await message.reply('Permission **Expulser** requise.');
      return;
    }
    const target = message.mentions.members?.first();
    if (!target) {
      await message.reply('Usage : `+kick @membre [raison]`');
      return;
    }
    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    if (!target.kickable) {
      await message.reply('Je ne peux pas expulser ce membre.');
      return;
    }
    await target.kick(reason);
    await message.reply(`**${target.user.tag}** a été expulsé — ${reason}`);
  },
};
