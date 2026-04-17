const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, isConfigAdmin } = require('../util/permissions');

module.exports = {
  name: 'say',
  description: 'Faire parler le bot',
  slashData: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Faire parler le bot')
    .addStringOption((o) =>
      o.setName('message').setDescription('Le message à envoyer').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async executeSlash(interaction) {
    const cfg = await getConfig(interaction.guildId);
    const admin =
      interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages) ||
      (await isConfigAdmin(interaction.member, cfg));

    if (!admin) {
      await interaction.reply({ content: 'Permission refusée.', ephemeral: true });
      return;
    }

    const text = interaction.options.getString('message', true);
    await interaction.reply({ content: 'Message envoyé.', ephemeral: true });
    await interaction.channel.send(text);
  },

  async executePrefix(message, args, { cfg }) {
    const admin =
      message.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      (await isConfigAdmin(message.member, cfg));

    if (!admin) return;

    const text = args.join(' ');
    if (!text) return message.reply('Usage : `+say <message>`');

    await message.delete().catch(() => {});
    await message.channel.send(text);
  },
};
