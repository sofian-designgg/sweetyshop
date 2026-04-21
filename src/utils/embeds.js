const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

// Créer un embed classique
function createEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || 0x5865f2)
    .setTimestamp();
    
  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.image) embed.setImage(options.image);
  if (options.footer) embed.setFooter({ text: options.footer });
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  
  return embed;
}

// Créer un panel de tickets classique (Embed + Select Menu)
function buildTicketPanel(cfg, guildName) {
  const embed = new EmbedBuilder()
    .setTitle(cfg.ticketPanelEmbed?.title || '🎫 Support')
    .setDescription(
      cfg.ticketPanelEmbed?.description || 
      `Bienvenue sur **${guildName}**.\n\nSélectionne une catégorie ci-dessous pour ouvrir un ticket.`
    )
    .setColor(cfg.ticketPanelEmbed?.color || 0x5865f2);
    
  if (cfg.ticketPanelEmbed?.image) {
    embed.setImage(cfg.ticketPanelEmbed.image);
  }
  
  if (cfg.ticketPanelEmbed?.footer) {
    embed.setFooter({ text: cfg.ticketPanelEmbed.footer });
  }

  // Créer un select menu pour les catégories (comme l'exemple ClearTrades)
  const categories = cfg.ticketCategories || [];
  
  if (categories.length === 0) {
    return { embeds: [embed], components: [] };
  }
  
  // Créer les options du select menu
  const options = categories.slice(0, 25).map(cat => {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(cat.label || cat.id)
      .setValue(cat.id)
      .setDescription(cat.hint || 'Clique pour ouvrir un ticket');
      
    if (cat.emoji) {
      const match = cat.emoji.match(/:(\d+)>?$/);
      if (match) option.setEmoji(match[1]);
      else option.setEmoji(cat.emoji);
    }
    
    return option;
  });
  
  // Créer le select menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_select_category')
    .setPlaceholder('Sélectionne une catégorie...')
    .addOptions(options);
  
  // Ajouter dans une ActionRow
  const row = new ActionRowBuilder().addComponents(selectMenu);
  
  return { embeds: [embed], components: [row] };
}

// Créer un panel d'exchanger classique (Embed + Select Menu)
function buildExchangerPanel(cfg) {
  const exchanger = cfg.exchangerConfig || {};
  const rates = exchanger.rates || {};
  
  const embed = new EmbedBuilder()
    .setTitle(exchanger.embed?.title || '💱 Exchanger')
    .setDescription(
      exchanger.embed?.description || 
      'Sélectionne une paire pour voir le taux de change.'
    )
    .setColor(exchanger.embed?.color || 0x5865f2);

  // Liste des paires
  const pairs = Object.entries(rates).slice(0, 25);
  
  if (pairs.length === 0) {
    embed.setDescription('Aucune paire configurée.');
    return { embeds: [embed], components: [] };
  }

  // Créer un menu déroulant
  const select = new StringSelectMenuBuilder()
    .setCustomId('exchanger_select')
    .setPlaceholder('Choisir une paire...')
    .addOptions(
      pairs.map(([pair, data]) => {
        const rate = typeof data === 'number' ? data : data?.rate || 1;
        const emoji = typeof data === 'object' ? data?.emoji : null;
        
        return new StringSelectMenuOptionBuilder()
          .setLabel(pair.toUpperCase())
          .setDescription(`Taux: ${rate}`)
          .setValue(pair)
          .setEmoji(emoji || '💱');
      })
    );

  const row = new ActionRowBuilder().addComponents(select);

  return { embeds: [embed], components: [row] };
}

// Panel de confirmation
function buildConfirmPanel(text, confirmId, cancelId) {
  const embed = new EmbedBuilder()
    .setColor(0xfaa61a)
    .setDescription(text);
    
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(confirmId)
        .setLabel('Confirmer')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
    );
    
  return { embeds: [embed], components: [row] };
}

module.exports = {
  createEmbed,
  buildTicketPanel,
  buildExchangerPanel,
  buildConfirmPanel,
};
