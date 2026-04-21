const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig } = require('../utils/permissions');
const { buildTicketPanel, createEmbed } = require('../utils/embeds');
const { createTicket } = require('../services/ticketService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gestion des tickets')
    .addSubcommand(sub =>
      sub.setName('panel-envoyer')
        .setDescription('Envoie le panel de tickets')
    )
    .addSubcommand(sub =>
      sub.setName('bouton-ajouter')
        .setDescription('Ajoute une catégorie de ticket')
        .addStringOption(opt => opt.setName('id').setDescription('ID unique (ex: support)').setRequired(true))
        .addStringOption(opt => opt.setName('label').setDescription('Texte du bouton').setRequired(true))
        .addStringOption(opt => opt.setName('prompt').setDescription('Texte au-dessus du bouton').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji du bouton'))
        .addStringOption(opt => opt.setName('style')
          .setDescription('Style du bouton')
          .addChoices(
            { name: 'Bleu (Primary)', value: 'Primary' },
            { name: 'Gris (Secondary)', value: 'Secondary' },
            { name: 'Vert (Success)', value: 'Success' },
            { name: 'Rouge (Danger)', value: 'Danger' },
          ))
    )
    .addSubcommand(sub =>
      sub.setName('bouton-supprimer')
        .setDescription('Supprime une catégorie')
        .addStringOption(opt => opt.setName('id').setDescription('ID de la catégorie').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('configurer')
        .setDescription('Configurer les options générales')
        .addChannelOption(opt => opt.setName('categorie').setDescription('Catégorie où créer les tickets').addChannelTypes(ChannelType.GuildCategory))
        .addChannelOption(opt => opt.setName('salon').setDescription('Salon pour le panel').addChannelTypes(ChannelType.GuildText))
        .addRoleOption(opt => opt.setName('role').setDescription('Rôle staff ticket'))
    )
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('Liste les catégories')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const cfg = await getConfig(interaction.guild.id);

    // Vérification admin pour toutes les sous-commandes sauf fermer
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ Tu dois avoir la permission **Gérer le serveur**.',
        ephemeral: true
      });
    }

    try {
      switch (subcommand) {
        case 'panel-envoyer':
          await handlePanelSend(interaction, cfg);
          break;
          
        case 'bouton-ajouter':
          await handleAddButton(interaction, cfg);
          break;
          
        case 'bouton-supprimer':
          await handleRemoveButton(interaction, cfg);
          break;
          
        case 'configurer':
          await handleConfigure(interaction, cfg);
          break;
          
        case 'liste':
          await handleList(interaction, cfg);
          break;
      }
    } catch (error) {
      console.error('[Ticket]', error);
      await interaction.reply({
        content: `❌ Erreur: ${error.message}`,
        ephemeral: true
      }).catch(() => {});
    }
  }
};

// Handler: Envoyer le panel
async function handlePanelSend(interaction, cfg) {
  if (!cfg.ticketPanelChannelId) {
    return interaction.reply({
      content: '❌ Configure d\'abord un salon avec `/ticket configurer salon:#salon`',
      ephemeral: true
    });
  }

  if (!cfg.ticketCategories?.length) {
    return interaction.reply({
      content: '❌ Ajoute d\'abord des catégories avec `/ticket bouton-ajouter`',
      ephemeral: true
    });
  }

  const channel = interaction.guild.channels.cache.get(cfg.ticketPanelChannelId);
  if (!channel) {
    return interaction.reply({
      content: '❌ Salon panel introuvable. Reconfigure avec `/ticket configurer`.',
      ephemeral: true
    });
  }

  const payload = buildTicketPanel(cfg, interaction.guild.name);
  
  // Mettre à jour ou envoyer
  if (cfg.ticketPanelMessageId) {
    try {
      const oldMsg = await channel.messages.fetch(cfg.ticketPanelMessageId);
      await oldMsg.edit(payload);
      
      await interaction.reply({
        content: `✅ Panel mis à jour dans ${channel}`,
        ephemeral: true
      });
      return;
    } catch {
      // Message introuvable, on envoie un nouveau
    }
  }
  
  const msg = await channel.send(payload);
  cfg.ticketPanelMessageId = msg.id;
  await cfg.save();
  
  await interaction.reply({
    content: `✅ Panel envoyé dans ${channel}`,
    ephemeral: true
  });
}

// Handler: Ajouter un bouton
async function handleAddButton(interaction, cfg) {
  const id = interaction.options.getString('id').toLowerCase().trim();
  const label = interaction.options.getString('label');
  const prompt = interaction.options.getString('prompt');
  const emoji = interaction.options.getString('emoji');
  const style = interaction.options.getString('style') || 'Secondary';

  // Vérifier si ID existe déjà
  if (cfg.ticketCategories?.find(c => c.id === id)) {
    return interaction.reply({
      content: `❌ L'ID \`${id}\` existe déjà.`,
      ephemeral: true
    });
  }

  // Ajouter
  if (!cfg.ticketCategories) cfg.ticketCategories = [];
  
  cfg.ticketCategories.push({
    id,
    label,
    prompt,
    emoji: emoji || '',
    style,
    hint: '',
    row: Math.floor(cfg.ticketCategories.length / 5)
  });
  
  await cfg.save();
  
  await interaction.reply({
    content: `✅ Catégorie \`${id}\` ajoutée.\nUtilise "/ticket panel-envoyer" pour rafraîchir.`,
    ephemeral: true
  });
}

// Handler: Supprimer un bouton
async function handleRemoveButton(interaction, cfg) {
  const id = interaction.options.getString('id').toLowerCase().trim();
  
  const initialLength = cfg.ticketCategories?.length || 0;
  cfg.ticketCategories = cfg.ticketCategories?.filter(c => c.id !== id) || [];
  
  if (cfg.ticketCategories.length === initialLength) {
    return interaction.reply({
      content: `❌ ID \`${id}\` introuvable.`,
      ephemeral: true
    });
  }
  
  await cfg.save();
  
  await interaction.reply({
    content: `✅ Catégorie \`${id}\` supprimée.\nPense à "/ticket panel-envoyer" pour rafraîchir.`,
    ephemeral: true
  });
}

// Handler: Configurer
async function handleConfigure(interaction, cfg) {
  const category = interaction.options.getChannel('categorie');
  const channel = interaction.options.getChannel('salon');
  const role = interaction.options.getRole('role');
  
  let updates = [];
  
  if (category) {
    cfg.ticketCategoryId = category.id;
    updates.push(`Catégorie: ${category.name}`);
  }
  
  if (channel) {
    cfg.ticketPanelChannelId = channel.id;
    updates.push(`Salon panel: ${channel}`);
  }
  
  if (role) {
    if (!cfg.ticketStaffRoleIds) cfg.ticketStaffRoleIds = [];
    if (!cfg.ticketStaffRoleIds.includes(role.id)) {
      cfg.ticketStaffRoleIds.push(role.id);
      updates.push(`Rôle staff: ${role.name}`);
    }
  }
  
  await cfg.save();
  
  if (updates.length === 0) {
    return interaction.reply({
      content: '❌ Précise au moins une option à configurer.',
      ephemeral: true
    });
  }
  
  await interaction.reply({
    content: `✅ Configuration mise à jour:\n${updates.join('\n')}`,
    ephemeral: true
  });
}

// Handler: Liste
async function handleList(interaction, cfg) {
  const cats = cfg.ticketCategories || [];
  
  if (cats.length === 0) {
    return interaction.reply({
      content: '📭 Aucune catégorie configurée.',
      ephemeral: true
    });
  }
  
  const list = cats.map((c, i) => 
    `${i + 1}. \`${c.id}\` - ${c.emoji || ''} ${c.label} (rangée ${c.row || 0})`
  ).join('\n');
  
  await interaction.reply({
    content: `📋 **Catégories de tickets (${cats.length}):**\n${list}`,
    ephemeral: true
  });
}
