const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const Ticket = require('../models/Ticket');
const { embedFromConfig } = require('../util/embeds');
const { isTicketStaff } = require('../util/permissions');

async function countOpenTickets(guildId, userId) {
  return Ticket.countDocuments({ guildId, userId, status: 'open' });
}

async function createTicketChannel(guild, member, categoryKey, cfg, product = null) {
  const parentId = cfg.ticketCategoryId;
  const cat = (cfg.ticketCategories || []).find((c) => c.id === categoryKey);
  const label = cat?.label || 'ticket';

  const safe = member.user.username.replace(/[^a-z0-9-_]/gi, '').slice(0, 12) || 'user';
  const name = `${label}-${safe}`.toLowerCase().slice(0, 100);

  const staffRoles = cfg.ticketStaffRoleIds || [];
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];

  for (const rid of staffRoles) {
    const role = guild.roles.cache.get(rid);
    if (role) {
      overwrites.push({
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }
  }

  const channelOptions = {
    name,
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites,
    topic: `Ticket · ${member.user.tag} · ${categoryKey}${product ? ` · Produit: ${product}` : ''}`,
  };

  if (parentId && guild.channels.cache.has(parentId)) {
    channelOptions.parent = parentId;
  }

  const channel = await guild.channels.create(channelOptions);

  await Ticket.create({
    guildId: guild.id,
    channelId: channel.id,
    userId: member.id,
    categoryId: categoryKey,
    status: 'open',
  });

  const welcomeRaw = cfg.ticketWelcomeEmbed || {
    title: '🎫 Ticket ouvert',
    description: `Salut {user}, décris ta demande avec un maximum de détails.\nUn membre du staff te répondra bientôt.`,
    color: 0x5865f2,
  };

  let desc = (welcomeRaw.description || '')
    .replace(/{user}/g, `${member}`)
    .replace(/{product}/g, product || 'Non spécifié');

  if (product) {
    desc += `\n\n**Produit demandé :** \`${product}\``;
  }

  const embed = embedFromConfig({ ...welcomeRaw, description: desc });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('Fermer le ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ content: `${member}`, embeds: [embed], components: [row] });
  return channel;
}

async function createExchangeTicket(guild, member, pair, amount, result, cfg) {
  const parentId = cfg.ticketCategoryId;
  const safe = member.user.username.replace(/[^a-z0-9-_]/gi, '').slice(0, 12) || 'user';
  const name = `exchange-${pair}-${safe}`.toLowerCase().slice(0, 100);

  const staffRoles = cfg.ticketStaffRoleIds || [];
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ];

  for (const rid of staffRoles) {
    const role = guild.roles.cache.get(rid);
    if (role) {
      overwrites.push({
        id: role.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      });
    }
  }

  const channelOptions = {
    name,
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites,
    topic: `Exchange · ${member.user.tag} · ${pair}`,
  };

  if (parentId && guild.channels.cache.has(parentId)) {
    channelOptions.parent = parentId;
  }

  const channel = await guild.channels.create(channelOptions);

  await Ticket.create({
    guildId: guild.id,
    channelId: channel.id,
    userId: member.id,
    categoryId: 'exchange',
    status: 'open',
  });

  const embed = new EmbedBuilder()
    .setTitle('🔄 Demande d’échange')
    .setColor(0x00ff00)
    .setDescription(`Nouvelle demande d’échange de ${member}.`)
    .addFields(
      { name: 'Paire', value: pair.toUpperCase(), inline: true },
      { name: 'Montant envoyé', value: `${amount}`, inline: true },
      { name: 'Montant reçu (estimé)', value: `${result}`, inline: true }
    )
    .setFooter({ text: 'Attendez qu’un staff valide l’échange.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('Fermer le ticket')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ content: `${member}`, embeds: [embed], components: [row] });
  return channel;
}

async function closeTicket(interaction, cfg) {
  const channel = interaction.channel;
  const doc = await Ticket.findOne({ channelId: channel.id, status: 'open' });
  if (!doc) {
    await interaction.reply({
      content: 'Ce salon n’est pas un ticket ouvert.',
      ephemeral: true,
    });
    return;
  }

  const member = interaction.member;
  const isStaff = await isTicketStaff(member, cfg);
  const isOwner = interaction.user.id === doc.userId;
  if (!isStaff && !isOwner) {
    await interaction.reply({
      content: 'Tu ne peux pas fermer ce ticket.',
      ephemeral: true,
    });
    return;
  }

  doc.status = 'closed';
  doc.closedAt = new Date();
  doc.closedBy = interaction.user.id;
  await doc.save();

  await interaction.reply({ content: 'Ticket fermé. Suppression du salon dans 5 secondes…' });
  const logId = cfg.ticketTranscriptChannelId;
  if (logId) {
    const logCh = interaction.guild.channels.cache.get(logId);
    if (logCh?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle('Ticket fermé')
        .setColor(0xed4245)
        .addFields(
          { name: 'Salon', value: channel.name, inline: true },
          { name: 'Par', value: interaction.user.tag, inline: true },
          { name: 'Catégorie', value: doc.categoryId, inline: true }
        )
        .setTimestamp();
      await logCh.send({ embeds: [embed] }).catch(() => {});
    }
  }

  setTimeout(() => channel.delete('Ticket fermé').catch(() => {}), 5000);
}

module.exports = {
  countOpenTickets,
  createTicketChannel,
  createExchangeTicket,
  closeTicket,
};
