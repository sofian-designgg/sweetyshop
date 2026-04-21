const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
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

    // Construction Components V2 avec bouton intégré
    const container = new ContainerBuilder();
    container.setAccentColor(0xfeb900);

    // Thumbnail avec avatar du client
    try {
      const thumbnail = new ThumbnailBuilder({
        media: { url: clientUser.displayAvatarURL() },
      });
      container.addThumbnail(thumbnail);
    } catch (e) {
      console.error('Erreur thumbnail review:', e.message);
    }

    // Titre
    container.addTextDisplay(new TextDisplayBuilder({
      content: '## ⭐ Laissez un avis !',
    }));

    // Description
    container.addTextDisplay(new TextDisplayBuilder({
      content: `Salut <@${doc.userId}> !\n\nTon achat est terminé. Si tu es satisfait du service de **Ohio Machine**, n'hésite pas à nous laisser un avis en cliquant sur le bouton ci-dessous.\n\nMerci de ta confiance !`,
    }));

    container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Medium));

    // Section avec bouton intégré
    const section = new SectionBuilder();
    section.addTextDisplay(new TextDisplayBuilder({
      content: '**⭐ Votre avis compte !**\nPartagez votre expérience avec la communauté.',
    }));
    
    const btn = new ButtonBuilder()
      .setCustomId(`review:open:${interaction.guildId}:${doc.userId}`)
      .setLabel('Laisser un avis')
      .setEmoji('⭐')
      .setStyle(ButtonStyle.Success);
    section.setAccessory(btn);
    
    container.addSection(section);

    await interaction.reply({
      content: 'Demande d\'avis envoyée.',
      ephemeral: true,
    });
    
    await channel.send({
      content: `<@${doc.userId}>`,
      components: [container],
    });
  },
};
