const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
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

// Créer un panel de tickets avec Components V2
function buildTicketPanel(cfg, guildName) {
  const containerComponents = [];
  
  // Titre
  const title = cfg.ticketPanelEmbed?.title || '🎫 Support';
  containerComponents.push(new SectionBuilder({
    components: [new TextDisplayBuilder({ content: `## ${String(title).slice(0, 256)}` })]
  }));
  
  // Description
  const description = cfg.ticketPanelEmbed?.description || `Bienvenue sur **${guildName}**.\n\nSélectionne une catégorie ci-dessous pour ouvrir un ticket.`;
  if (description) {
    containerComponents.push(new SectionBuilder({
      components: [new TextDisplayBuilder({ content: String(description).slice(0, 4000) })]
    }));
  }
  
  // Séparateur
  containerComponents.push(new SeparatorBuilder().setSpacing(1));
  
  // Catégories - chaque catégorie devient une section avec bouton accessory
  const categories = cfg.ticketCategories || [];
  
  for (const cat of categories.slice(0, 10)) {
    if (!cat.id || !cat.label) continue;
    
    const prompt = cat.prompt || cat.label;
    const hint = (cat.hint || 'Clique pour ouvrir un ticket').trim() || '\u200b';
    
    // Créer le bouton
    const style = ButtonStyle[cat.style] || ButtonStyle.Secondary;
    const btn = new ButtonBuilder()
      .setCustomId(`ticket_open_${cat.id}`)
      .setLabel(String(cat.label).slice(0, 80))
      .setStyle(style);
    
    if (cat.emoji) {
      const emojiStr = String(cat.emoji).trim();
      const match = emojiStr.match(/:(\d+)>?$/);
      if (match) btn.setEmoji(match[1]);
      else btn.setEmoji(emojiStr);
    }
    
    // Section avec texte + bouton accessory
    const section = new SectionBuilder({
      components: [new TextDisplayBuilder({
        content: `**${String(prompt).slice(0, 256)}**\n${String(hint).slice(0, 1024)}`.slice(0, 1024),
      })],
      accessory: btn
    });
    
    containerComponents.push(section);
  }
  
  // Image si présente
  if (cfg.ticketPanelEmbed?.image) {
    containerComponents.push(new SeparatorBuilder().setSpacing(1));
    containerComponents.push(new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder({ media: { url: cfg.ticketPanelEmbed.image } })
    ));
  }
  
  // Footer si présent
  if (cfg.ticketPanelEmbed?.footer) {
    containerComponents.push(new SeparatorBuilder().setSpacing(1));
    containerComponents.push(new SectionBuilder({
      components: [new TextDisplayBuilder({
        content: `*${String(cfg.ticketPanelEmbed.footer).slice(0, 2048)}*`
      })]
    }));
  }
  
  // Créer le container
  const container = new ContainerBuilder({ components: containerComponents });
  
  // Couleur
  const color = cfg.ticketPanelEmbed?.color;
  if (typeof color === 'number' && !isNaN(color)) {
    container.setAccentColor(color);
  }
  
  return { components: [container] };
}

// Créer un panel d'exchanger avec Components V2
function buildExchangerPanel(cfg) {
  const exchanger = cfg.exchangerConfig || {};
  const rates = exchanger.rates || {};
  
  const containerComponents = [];
  
  // Titre
  const title = exchanger.embed?.title || '💱 Exchanger';
  containerComponents.push(new SectionBuilder({
    components: [new TextDisplayBuilder({ content: `## ${String(title).slice(0, 256)}` })]
  }));
  
  // Description
  const description = exchanger.embed?.description || 'Sélectionne une paire pour voir le taux de change.';
  containerComponents.push(new SectionBuilder({
    components: [new TextDisplayBuilder({ content: String(description).slice(0, 4000) })]
  }));
  
  // Liste des paires
  const pairs = Object.entries(rates).slice(0, 10);
  
  if (pairs.length === 0) {
    containerComponents.push(new SectionBuilder({
      components: [new TextDisplayBuilder({ content: 'Aucune paire configurée.' })]
    }));
  } else {
    containerComponents.push(new SeparatorBuilder().setSpacing(1));
    
    // Chaque paire devient une section avec bouton
    for (const [pair, data] of pairs) {
      const rate = typeof data === 'number' ? data : data?.rate || 1;
      const emoji = typeof data === 'object' ? data?.emoji : '💱';
      const desc = typeof data === 'object' ? data?.description : '';
      
      // Bouton
      const btn = new ButtonBuilder()
        .setCustomId(`exchanger_select_${pair}`)
        .setLabel('Échanger')
        .setStyle(ButtonStyle.Primary);
      
      // Section avec texte + bouton
      const section = new SectionBuilder({
        components: [new TextDisplayBuilder({
          content: `${emoji} **${String(pair).toUpperCase()}**\nTaux: ${rate}${desc ? ` | ${desc}` : ''}`.slice(0, 1024),
        })],
        accessory: btn
      });
      
      containerComponents.push(section);
    }
  }
  
  // Créer le container
  const container = new ContainerBuilder({ components: containerComponents });
  
  // Couleur
  const color = exchanger.embed?.color;
  if (typeof color === 'number' && !isNaN(color)) {
    container.setAccentColor(color);
  }
  
  return { components: [container] };
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
