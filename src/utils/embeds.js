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

// Créer un panel de tickets (Classic Embed + Buttons)
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

  // Grouper les boutons par rangée
  const categories = cfg.ticketCategories || [];
  const rows = [];
  
  // Grouper par row (max 5 boutons par row)
  const grouped = categories.reduce((acc, cat) => {
    const row = cat.row || 0;
    if (!acc[row]) acc[row] = [];
    if (acc[row].length < 5) acc[row].push(cat);
    return acc;
  }, {});
  
  // Créer les ActionRows
  Object.keys(grouped).sort().forEach(rowNum => {
    const rowCats = grouped[rowNum];
    const row = new ActionRowBuilder();
    
    for (const cat of rowCats) {
      const style = ButtonStyle[cat.style] || ButtonStyle.Secondary;
      const btn = new ButtonBuilder()
        .setCustomId(`ticket_open_${cat.id}`)
        .setLabel(cat.label || cat.id)
        .setStyle(style);
        
      if (cat.emoji) {
        // Extraire l'ID si custom emoji
        const match = cat.emoji.match(/:(\d+)>?$/);
        if (match) btn.setEmoji(match[1]);
        else btn.setEmoji(cat.emoji);
      }
      
      row.addComponents(btn);
    }
    
    if (row.components.length > 0) rows.push(row);
  });

  return { embeds: [embed], components: rows };
}

// Créer un panel d'exchanger
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
