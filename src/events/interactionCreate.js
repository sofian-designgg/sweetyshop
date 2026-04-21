const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getConfig, isTicketStaff } = require('../utils/permissions');
const { createTicket, closeTicket, deleteTicket } = require('../services/ticketService');
const { createEmbed } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      // ==================== SLASH COMMANDS ====================
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        
        await command.execute(interaction);
        return;
      }

      // ==================== BUTTONS ====================
      if (interaction.isButton()) {
        const { customId } = interaction;
        
        // Ouvrir un ticket (ticket_open_xxx)
        if (customId.startsWith('ticket_open_')) {
          await handleTicketOpen(interaction);
          return;
        }
        
        // Fermer un ticket
        if (customId === 'ticket_close') {
          await handleTicketClose(interaction);
          return;
        }
        
        // Supprimer un ticket
        if (customId === 'ticket_delete') {
          await handleTicketDelete(interaction);
          return;
        }
        
        return;
      }

      // ==================== SELECT MENUS ====================
      if (interaction.isStringSelectMenu()) {
        const { customId, values } = interaction;
        
        // Exchanger select menu
        if (customId === 'exchanger_select') {
          await handleExchangerSelect(interaction, values[0]);
          return;
        }
        
        return;
      }

      // ==================== MODALS ====================
      if (interaction.isModalSubmit()) {
        const { customId } = interaction;
        
        if (customId === 'ticket_embed_builder') {
          await handleTicketEmbedBuilderSubmit(interaction);
          return;
        }
        
        if (customId.startsWith('ticket_modal_')) {
          await handleTicketModalSubmit(interaction);
          return;
        }
        
        return;
      }

    } catch (error) {
      console.error('[Interaction]', error);
      
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: `❌ Une erreur est survenue: ${error.message}`,
            flags: MessageFlags.Ephemeral
          });
        } else {
          await interaction.reply({
            content: `❌ Une erreur est survenue: ${error.message}`,
            flags: MessageFlags.Ephemeral
          });
        }
        
        // Notifier l'utilisateur en MP
        try {
          await interaction.user.send({
            content: `⚠️ **Erreur**\n\n\`${error.message}\`\n\nSi le problème persiste, contacte un administrateur.`
          });
        } catch {
          // MP impossible
        }
      } catch {
        // Impossible de répondre
      }
    }
  }
};

// Handler: Ouvrir un ticket (bouton)
async function handleTicketOpen(interaction) {
  const categoryId = interaction.customId.replace('ticket_open_', '');
  const cfg = await getConfig(interaction.guild.id);
  const category = cfg.ticketCategories?.find(c => c.id === categoryId);
  
  if (!category) {
    return interaction.reply({
      content: '❌ Cette catégorie n\'existe plus.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Vérifier si catégorie parent configurée
  if (!cfg.ticketCategoryId) {
    return interaction.reply({
      content: '❌ La catégorie des tickets n\'est pas configurée. Contacte un admin.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Check si déjà un ticket ouvert
  const { Ticket } = require('../database');
  const existing = await Ticket.findOne({
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    status: 'open',
    category: categoryId
  });

  if (existing) {
    const channel = interaction.guild.channels.cache.get(existing.channelId);
    if (channel) {
      return interaction.reply({
        content: `❌ Tu as déjà un ticket ouvert: ${channel}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  // Si pas de prompt spécifique, créer directement
  if (!category.prompt || category.prompt.trim().length < 3) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
      const channel = await createTicket(interaction.guild, interaction.user, categoryId, cfg);
      await interaction.editReply({
        content: `✅ Ticket créé: ${channel}`
      });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Erreur: ${error.message}`
      });
    }
    return;
  }

  // Sinon, ouvrir un modal
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${categoryId}`)
    .setTitle(category.label || 'Nouveau ticket');

  const input = new TextInputBuilder()
    .setCustomId('ticket_reason')
    .setLabel(category.prompt.slice(0, 45))
    .setPlaceholder('Décris ta demande ici...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const row = new ActionRowBuilder().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

// Handler: Modal submit
async function handleTicketModalSubmit(interaction) {
  const categoryId = interaction.customId.replace('ticket_modal_', '');
  const reason = interaction.fields.getTextInputValue('ticket_reason');
  
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
  const cfg = await getConfig(interaction.guild.id);
  
  try {
    const channel = await createTicket(interaction.guild, interaction.user, categoryId, cfg);
    
    // Envoyer le reason dans le ticket
    await channel.send({
      embeds: [createEmbed({
        title: '📝 Description',
        description: reason,
        color: 0x5865f2
      })]
    });
    
    await interaction.editReply({
      content: `✅ Ticket créé: ${channel}`
    });
  } catch (error) {
    await interaction.editReply({
      content: `❌ Erreur: ${error.message}`
    });
  }
}

// Handler: Fermer un ticket
async function handleTicketClose(interaction) {
  const { Ticket } = require('../database');
  const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
  
  if (!ticket) {
    return interaction.reply({
      content: '❌ Ce salon n\'est pas un ticket.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Vérifier permissions
  const isStaff = await isTicketStaff(interaction.member, interaction.guild.id);
  const isCreator = ticket.userId === interaction.user.id;
  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
  
  if (!isStaff && !isCreator && !isAdmin) {
    return interaction.reply({
      content: '❌ Tu ne peux pas fermer ce ticket.',
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply();
  
  try {
    await closeTicket(interaction.channel, interaction.user, '');
    await interaction.editReply({ content: '🔒 Ticket fermé.' });
  } catch (error) {
    await interaction.editReply({ content: `❌ Erreur: ${error.message}` });
  }
}

// Handler: Supprimer un ticket
async function handleTicketDelete(interaction) {
  const { Ticket } = require('../database');
  const ticket = await Ticket.findOne({ channelId: interaction.channel.id });
  
  if (!ticket) {
    return interaction.reply({
      content: '❌ Ce salon n\'est pas un ticket.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Vérifier permissions (seulement staff ou admin)
  const isStaff = await isTicketStaff(interaction.member, interaction.guild.id);
  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
  
  if (!isStaff && !isAdmin) {
    return interaction.reply({
      content: '❌ Seul le staff peut supprimer un ticket.',
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.deferReply();
  
  try {
    await deleteTicket(interaction.channel);
    // Le salon est supprimé, pas besoin de répondre
  } catch (error) {
    await interaction.editReply({ content: `❌ Erreur: ${error.message}` });
  }
}

// Handler: Exchanger select
async function handleExchangerSelect(interaction, pair) {
  const cfg = await getConfig(interaction.guild.id);
  const rate = cfg.exchangerConfig?.rates?.[pair];
  
  if (!rate) {
    return interaction.reply({
      content: '❌ Cette paire n\'existe plus.',
      flags: MessageFlags.Ephemeral
    });
  }

  const rateValue = typeof rate === 'number' ? rate : rate?.rate || 1;
  
  await interaction.reply({
    content: `💱 **${pair.toUpperCase()}**\nTaux actuel: \`${rateValue}\`\n\nContacte le staff pour effectuer l'échange.`,
    flags: MessageFlags.Ephemeral
  });
}

// Handler: Modal pour créer l'embed du panel ticket
async function handleTicketEmbedBuilderSubmit(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
  try {
    // Récupérer les valeurs du modal
    const title = interaction.fields.getTextInputValue('embed_title');
    const description = interaction.fields.getTextInputValue('embed_description');
    const colorHex = interaction.fields.getTextInputValue('embed_color');
    const footer = interaction.fields.getTextInputValue('embed_footer');
    const image = interaction.fields.getTextInputValue('embed_image');
    
    // Récupérer le channel
    const channelId = interaction.client.tempTicketChannel;
    if (!channelId) {
      return interaction.editReply({
        content: '❌ Erreur: canal non trouvé. Réessaye la commande.',
      });
    }
    
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      return interaction.editReply({
        content: '❌ Salon introuvable.',
      });
    }
    
    // Créer l'embed
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();
    
    // Couleur
    if (colorHex) {
      const color = parseInt(colorHex.replace('#', ''), 16);
      if (!isNaN(color)) embed.setColor(color);
      else embed.setColor(0x1FFFBF);
    } else {
      embed.setColor(0x1FFFBF);
    }
    
    // Footer
    if (footer) {
      embed.setFooter({ text: footer });
    }
    
    // Image
    if (image) {
      embed.setImage(image);
    }
    
    // Récupérer les catégories de tickets
    const { getConfig } = require('../utils/permissions');
    const cfg = await getConfig(interaction.guild.id);
    const categories = cfg.ticketCategories || [];
    
    // Créer le select menu
    const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
    
    let components = [];
    
    if (categories.length > 0) {
      const options = categories.slice(0, 25).map(cat => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(cat.label || cat.id)
          .setValue(cat.id)
          .setDescription(cat.hint?.substring(0, 100) || 'Clique pour ouvrir');
        
        if (cat.emoji) {
          const match = cat.emoji.match(/:(\d+)>?$/);
          if (match) {
            const isAnimated = cat.emoji.startsWith('<a:');
            option.setEmoji({ id: match[1], animated: isAnimated });
          } else {
            option.setEmoji(cat.emoji);
          }
        }
        
        return option;
      });
      
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_select_category')
        .setPlaceholder('Sélectionne une catégorie...')
        .addOptions(options);
      
      const row = new ActionRowBuilder().addComponents(selectMenu);
      components.push(row);
    }
    
    // Envoyer le panel
    const msg = await channel.send({ embeds: [embed], components });
    
    // Sauvegarder l'ID
    cfg.ticketPanelMessageId = msg.id;
    cfg.ticketPanelChannelId = channel.id;
    await cfg.save();
    
    await interaction.editReply({
      content: `✅ Panel envoyé dans ${channel}`,
    });
    
  } catch (error) {
    console.error('[TicketEmbedBuilder]', error);
    await interaction.editReply({
      content: `❌ Erreur: ${error.message}`,
    });
  }
}
