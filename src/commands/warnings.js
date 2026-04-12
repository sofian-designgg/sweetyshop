const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Warning = require('../models/Warning');

module.exports = {
  name: 'warnings',
  aliases: ['avertissements', 'sanctions'],
  description: 'Lister les avertissements',
  slashData: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Voir les avertissements d’un membre')
    .addUserOption((o) =>
      o.setName('membre').setDescription('Membre').setRequired(true)
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
    const list = await Warning.find({ guildId: interaction.guildId, userId: user.id })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();
    const embed = new EmbedBuilder()
      .setTitle(`Avertissements — ${user.tag}`)
      .setColor(0xed4245);
    if (!list.length) embed.setDescription('Aucun avertissement.');
    else {
      embed.setDescription(
        list
          .map(
            (w, i) =>
              `**${i + 1}.** ${w.reason}\n<t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R>`
          )
          .join('\n\n')
      );
    }
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
  async executePrefix(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await message.reply('Permission **Modérer les membres** requise.');
      return;
    }
    const target = message.mentions.users?.first();
    if (!target) {
      await message.reply('Usage : `+warnings @membre`');
      return;
    }
    const list = await Warning.find({ guildId: message.guild.id, userId: target.id })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();
    const embed = new EmbedBuilder()
      .setTitle(`Avertissements — ${target.tag}`)
      .setColor(0xed4245);
    if (!list.length) embed.setDescription('Aucun avertissement.');
    else {
      embed.setDescription(
        list
          .map(
            (w, i) =>
              `**${i + 1}.** ${w.reason}\n<t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R>`
          )
          .join('\n\n')
      );
    }
    await message.reply({ embeds: [embed] });
  },
};
