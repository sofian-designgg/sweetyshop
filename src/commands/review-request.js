const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const Ticket = require('../models/Ticket');

module.exports = {
  name: 'review-request',
  description: 'Demander un avis au client du ticket',
  slashData: new SlashCommandBuilder()
    .setName('review-request')
    .setDescription('Demander un avis au client du ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async executeSlash(interaction) {
    const channel = interaction.channel;
    const doc = await Ticket.findOne({ channelId: channel.id, status: 'open' });

    if (!doc) {
      return interaction.reply({
        content: 'Cette commande doit être utilisée dans un ticket ouvert.',
        ephemeral: true,
      });
    }

    const clientUser = await interaction.client.users.fetch(doc.userId).catch(() => null);
    if (!clientUser) {
      return interaction.reply({
        content: 'Impossible de trouver le client du ticket.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('⭐ Laissez un avis !')
      .setDescription(
        `Salut <@${doc.userId}> !\n\nTon achat est terminé. Si tu es satisfait du service de **Ohio Machine**, n'hésite pas à nous laisser un avis en cliquant sur le bouton ci-dessous.\n\nMerci de ta confiance !`
      )
      .setColor(0xfeb900)
      .setThumbnail(clientUser.displayAvatarURL());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`review:open:${interaction.guildId}:${doc.userId}`)
        .setLabel('Laisser un avis')
        .setEmoji('⭐')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      content: 'Demande d’avis envoyée.',
      ephemeral: true,
    });
    
    await channel.send({
      content: `<@${doc.userId}>`,
      embeds: [embed],
      components: [row],
    });
  },
};
