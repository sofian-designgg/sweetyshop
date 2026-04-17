const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, isConfigAdmin } = require('../util/permissions');
const { embedFromConfig } = require('../util/embeds');

module.exports = {
  name: 'json',
  description: 'Envoyer un embed personnalisé via JSON',
  slashData: new SlashCommandBuilder()
    .setName('json')
    .setDescription('Envoyer un embed personnalisé via JSON')
    .addStringOption((o) =>
      o.setName('data').setDescription('Le JSON de l’embed').setRequired(true)
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

    const rawJson = interaction.options.getString('data', true);
    try {
      const parsed = JSON.parse(rawJson);
      const embed = embedFromConfig(parsed);
      await interaction.reply({ content: 'Embed envoyé.', ephemeral: true });
      await interaction.channel.send({ embeds: [embed] });
    } catch (e) {
      await interaction.reply({ content: 'JSON invalide.', ephemeral: true });
    }
  },

  async executePrefix(message, args, { cfg }) {
    const admin =
      message.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      (await isConfigAdmin(message.member, cfg));

    if (!admin) return;

    const rawJson = args.join(' ');
    if (!rawJson) return message.reply('Usage : `+json <json_data>`');

    try {
      const parsed = JSON.parse(rawJson);
      const embed = embedFromConfig(parsed);
      await message.delete().catch(() => {});
      await message.channel.send({ embeds: [embed] });
    } catch (e) {
      await message.reply('JSON invalide.');
    }
  },
};
