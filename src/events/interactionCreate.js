const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
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
        
        // Exchanger
        if (customId === 'exchanger_select') {
          await handleExchangerSelect(interaction, values[0]);
          return;
        }
        
        return;
      }

      // ==================== MODALS ====================
      if (interaction.isModalSubmit()) {
        const { customId } = interaction;
        
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
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: `❌ Une erreur est survenue: ${error.message}`,
            ephemeral: true
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
      ephemeral: true
    });
  }

  // Vérifier si catégorie parent configurée
  if (!cfg.ticketCategoryId) {
    return interaction.reply({
      content: '❌ La catégorie des tickets n\'est pas configurée. Contacte un admin.',
      ephemeral: true
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
        ephemeral: true
      });
    }
  }

  // Si pas de prompt spécifique, créer directement
  if (!category.prompt || category.prompt.trim().length < 3) {
    await interaction.deferReply({ ephemeral: true });
    
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
  
  await interaction.deferReply({ ephemeral: true });
  
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
      ephemeral: true
    });
  }

  // Vérifier permissions
  const isStaff = await isTicketStaff(interaction.member, interaction.guild.id);
  const isCreator = ticket.userId === interaction.user.id;
  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
  
  if (!isStaff && !isCreator && !isAdmin) {
    return interaction.reply({
      content: '❌ Tu ne peux pas fermer ce ticket.',
      ephemeral: true
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
      ephemeral: true
    });
  }

  // Vérifier permissions (seulement staff ou admin)
  const isStaff = await isTicketStaff(interaction.member, interaction.guild.id);
  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
  
  if (!isStaff && !isAdmin) {
    return interaction.reply({
      content: '❌ Seul le staff peut supprimer un ticket.',
      ephemeral: true
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
      ephemeral: true
    });
  }

  const rateValue = typeof rate === 'number' ? rate : rate?.rate || 1;
  
  await interaction.reply({
    content: `💱 **${pair.toUpperCase()}**\nTaux actuel: \`${rateValue}\`\n\nContacte le staff pour effectuer l'échange.`,
    ephemeral: true
  });
}
