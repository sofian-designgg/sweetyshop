const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { Ticket } = require('../database');

async function createTicket(guild, user, categoryId, cfg) {
  const category = cfg.ticketCategories?.find(c => c.id === categoryId);
  if (!category) throw new Error('Catégorie introuvable');

  const parentId = cfg.ticketCategoryId;
  const staffRoles = cfg.ticketStaffRoleIds || [];
  
  // Générer le nom du salon
  const safeName = user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 15) || 'user';
  const channelName = `${category.id}-${safeName}`.slice(0, 100);

  // Permissions
  const permissions = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  // Ajouter les rôles staff
  for (const roleId of staffRoles) {
    permissions.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  // Créer le salon
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId || undefined,
    permissionOverwrites: permissions,
    topic: `Ticket de ${user.tag} | Catégorie: ${category.label}`
  });

  // Sauvegarder dans la DB
  await Ticket.create({
    guildId: guild.id,
    channelId: channel.id,
    userId: user.id,
    category: categoryId,
    status: 'open'
  });

  // Envoyer le message de bienvenue
  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`🎫 Ticket - ${category.label}`)
    .setDescription(`Bienvenue ${user}!\n\nUn membre du staff va t'aider rapidement.`)
    .setColor(cfg.ticketPanelEmbed?.color || 0x5865f2)
    .setTimestamp();

  const closeRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

  await channel.send({
    content: `${user} <@${user.id}>`,
    embeds: [welcomeEmbed],
    components: [closeRow]
  });

  // Ping le staff si configuré
  if (staffRoles.length > 0) {
    const pings = staffRoles.map(id => `<@&${id}>`).join(' ');
    await channel.send({
      content: `📢 ${pings} Nouveau ticket!`,
      allowedMentions: { roles: staffRoles }
    }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
  }

  return channel;
}

async function closeTicket(channel, closedBy, reason = '') {
  const ticket = await Ticket.findOne({ channelId: channel.id });
  if (!ticket) throw new Error('Ticket introuvable dans la base de données');

  ticket.status = 'closed';
  ticket.closedAt = new Date();
  ticket.closedBy = closedBy.id;
  await ticket.save();

  // Renommer le salon
  await channel.setName(`closed-${channel.name}`.slice(0, 100)).catch(() => {});

  // Retirer les permissions du créateur
  const creatorId = ticket.userId;
  await channel.permissionOverwrites.delete(creatorId).catch(() => {});

  // Message de fermeture
  const embed = new EmbedBuilder()
    .setTitle('🔒 Ticket fermé')
    .setDescription(`Fermé par ${closedBy.tag}${reason ? `\nRaison: ${reason}` : ''}`)
    .setColor(0xed4245)
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  // Bouton pour supprimer
  const deleteRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_delete')
        .setLabel('Supprimer définitivement')
        .setStyle(ButtonStyle.Danger)
    );

  await channel.send({
    content: 'Le ticket est fermé. Le créateur ne voit plus ce salon.',
    components: [deleteRow]
  });

  return ticket;
}

async function deleteTicket(channel) {
  const ticket = await Ticket.findOne({ channelId: channel.id });
  if (ticket) {
    await Ticket.deleteOne({ channelId: channel.id });
  }
  
  await channel.delete().catch(() => {});
  return ticket;
}

module.exports = {
  createTicket,
  closeTicket,
  deleteTicket
};
