const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Créer et envoyer un message embed personnalisé')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('envoyer')
        .setDescription('Envoyer un embed dans un salon')
        .addChannelOption((option) =>
          option
            .setName('salon')
            .setDescription('Salon où envoyer l\'embed')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption((option) =>
          option
            .setName('titre')
            .setDescription('Titre de l\'embed')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('description')
            .setDescription('Description de l\'embed')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('couleur')
            .setDescription('Couleur de l\'embed (hex, ex: #5865f2)')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('image')
            .setDescription('URL de l\'image principale')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('thumbnail')
            .setDescription('URL de la miniature (thumbnail)')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('footer')
            .setDescription('Texte du footer')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('author')
            .setDescription('Nom de l\'auteur')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('author_icon')
            .setDescription('URL de l\'icône de l\'auteur')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('editer')
        .setDescription('Modifier un embed existant')
        .addStringOption((option) =>
          option
            .setName('message_id')
            .setDescription('ID du message à modifier')
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName('salon')
            .setDescription('Salon du message (optionnel)')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption((option) =>
          option
            .setName('titre')
            .setDescription('Nouveau titre')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('description')
            .setDescription('Nouvelle description')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('couleur')
            .setDescription('Nouvelle couleur (hex)')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('image')
            .setDescription('Nouvelle URL d\'image')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('thumbnail')
            .setDescription('Nouvelle URL de thumbnail')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('footer')
            .setDescription('Nouveau footer')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'envoyer') {
        await handleSend(interaction);
      } else if (subcommand === 'editer') {
        await handleEdit(interaction);
      }
    } catch (error) {
      console.error('[Embed]', error);
      await interaction.reply({
        content: `❌ Erreur: ${error.message}`,
        ephemeral: true
      }).catch(() => {});
    }
  }
};

// Handler: Envoyer un embed
async function handleSend(interaction) {
  const channel = interaction.options.getChannel('salon');
  const title = interaction.options.getString('titre');
  const description = interaction.options.getString('description');
  const colorHex = interaction.options.getString('couleur');
  const imageUrl = interaction.options.getString('image');
  const thumbnailUrl = interaction.options.getString('thumbnail');
  const footerText = interaction.options.getString('footer');
  const authorName = interaction.options.getString('author');
  const authorIcon = interaction.options.getString('author_icon');

  // Créer l'embed
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description);

  // Couleur
  if (colorHex) {
    const color = parseInt(colorHex.replace('#', ''), 16);
    if (!isNaN(color)) {
      embed.setColor(color);
    } else {
      embed.setColor(0x5865f2);
    }
  } else {
    embed.setColor(0x5865f2);
  }

  // Image
  if (imageUrl) {
    embed.setImage(imageUrl);
  }

  // Thumbnail
  if (thumbnailUrl) {
    embed.setThumbnail(thumbnailUrl);
  }

  // Footer
  if (footerText) {
    embed.setFooter({ text: footerText });
  }

  // Author
  if (authorName) {
    const authorData = { name: authorName };
    if (authorIcon) {
      authorData.iconURL = authorIcon;
    }
    embed.setAuthor(authorData);
  }

  // Timestamp
  embed.setTimestamp();

  // Envoyer
  await channel.send({ embeds: [embed] });

  await interaction.reply({
    content: `✅ Embed envoyé dans ${channel}`,
    ephemeral: true
  });
}

// Handler: Modifier un embed
async function handleEdit(interaction) {
  const messageId = interaction.options.getString('message_id');
  const channel = interaction.options.getChannel('salon') || interaction.channel;

  const title = interaction.options.getString('titre');
  const description = interaction.options.getString('description');
  const colorHex = interaction.options.getString('couleur');
  const imageUrl = interaction.options.getString('image');
  const thumbnailUrl = interaction.options.getString('thumbnail');
  const footerText = interaction.options.getString('footer');

  try {
    const message = await channel.messages.fetch(messageId);
    
    if (!message.embeds || message.embeds.length === 0) {
      return interaction.reply({
        content: '❌ Ce message ne contient pas d\'embed.',
        ephemeral: true
      });
    }

    // Récupérer l'embed existant et le modifier
    const oldEmbed = message.embeds[0];
    const embed = EmbedBuilder.from(oldEmbed);

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    
    if (colorHex) {
      const color = parseInt(colorHex.replace('#', ''), 16);
      if (!isNaN(color)) {
        embed.setColor(color);
      }
    }
    
    if (imageUrl) embed.setImage(imageUrl);
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
    if (footerText) embed.setFooter({ text: footerText });

    await message.edit({ embeds: [embed] });

    await interaction.reply({
      content: `✅ Embed modifié dans ${channel}`,
      ephemeral: true
    });
  } catch (error) {
    await interaction.reply({
      content: `❌ Impossible de modifier le message: ${error.message}`,
      ephemeral: true
    });
  }
}
