const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

// Import CV2 Helper (comme le bot DMall Python)
const cv2 = require('./cv2Helper');

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

// Créer un panel de tickets avec Components V2 (comme DMall)
function buildTicketPanel(cfg, guildName) {
  const components = [];
  
  // Titre
  const title = cfg.ticketPanelEmbed?.title || '🎫 Support';
  components.push(cv2.section(`## ${title}`));
  
  // Description
  const description = cfg.ticketPanelEmbed?.description || `Bienvenue sur **${guildName}**.\n\nSélectionne une catégorie ci-dessous pour ouvrir un ticket.`;
  if (description) {
    components.push(cv2.section(description));
  }
  
  // Séparateur
  components.push(cv2.separator(1));
  
  // Catégories - chaque catégorie devient une section avec bouton accessory
  const categories = cfg.ticketCategories || [];
  
  for (const cat of categories.slice(0, 10)) {
    if (!cat.id || !cat.label) continue;
    
    const prompt = cat.prompt || cat.label;
    const hint = (cat.hint || 'Clique pour ouvrir un ticket').trim() || '\u200b';
    
    // Style du bouton (1=Primary, 2=Secondary, 3=Success, 4=Danger)
    const styleMap = { 'Primary': 1, 'Secondary': 2, 'Success': 3, 'Danger': 4 };
    const style = styleMap[cat.style] || 2;
    
    // Créer le bouton
    const btn = cv2.button(
      `ticket_open_${cat.id}`,
      cat.label,
      style,
      cat.emoji
    );
    
    // Section avec texte + bouton accessory
    components.push(cv2.section(`**${prompt}**\n${hint}`, btn));
  }
  
  // Image si présente
  if (cfg.ticketPanelEmbed?.image) {
    components.push(cv2.separator(1));
    components.push(cv2.media_gallery([cfg.ticketPanelEmbed.image]));
  }
  
  // Footer si présent
  if (cfg.ticketPanelEmbed?.footer) {
    components.push(cv2.separator(1));
    components.push(cv2.section(`*${cfg.ticketPanelEmbed.footer}*`));
  }
  
  // Créer le container avec accent color
  const color = cfg.ticketPanelEmbed?.color;
  const container = cv2.container(
    ...components,
    { accent_color: color }
  );
  
  return container;
}

// Fonctions pour envoyer/mettre à jour avec CV2
async function sendTicketPanel(client, channelId, cfg, guildName) {
  const container = buildTicketPanel(cfg, guildName);
  return cv2.sendChannelV2(client, channelId, container);
}

async function editTicketPanel(client, channelId, messageId, cfg, guildName) {
  const container = buildTicketPanel(cfg, guildName);
  return cv2.editMessageV2(client, channelId, messageId, container);
}

// Créer un panel d'exchanger avec Components V2 (comme DMall)
function buildExchangerPanel(cfg) {
  const exchanger = cfg.exchangerConfig || {};
  const rates = exchanger.rates || {};
  
  const components = [];
  
  // Titre
  const title = exchanger.embed?.title || '💱 Exchanger';
  components.push(cv2.section(`## ${title}`));
  
  // Description
  const description = exchanger.embed?.description || 'Sélectionne une paire pour voir le taux de change.';
  components.push(cv2.section(description));
  
  // Liste des paires
  const pairs = Object.entries(rates).slice(0, 10);
  
  if (pairs.length === 0) {
    components.push(cv2.section('Aucune paire configurée.'));
  } else {
    components.push(cv2.separator(1));
    
    // Chaque paire devient une section avec bouton
    for (const [pair, data] of pairs) {
      const rate = typeof data === 'number' ? data : data?.rate || 1;
      const emoji = typeof data === 'object' ? data?.emoji : '💱';
      const desc = typeof data === 'object' ? data?.description : '';
      
      // Bouton
      const btn = cv2.button(
        `exchanger_select_${pair}`,
        'Échanger',
        1, // Primary
        null
      );
      
      // Section avec texte + bouton
      components.push(cv2.section(
        `${emoji} **${pair.toUpperCase()}**\nTaux: ${rate}${desc ? ` | ${desc}` : ''}`,
        btn
      ));
    }
  }
  
  // Créer le container
  const color = exchanger.embed?.color;
  const container = cv2.container(
    ...components,
    { accent_color: color }
  );
  
  return container;
}

// Fonction pour envoyer le panel exchanger
async function sendExchangerPanel(client, channelId, cfg) {
  const container = buildExchangerPanel(cfg);
  return cv2.sendChannelV2(client, channelId, container);
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
  sendTicketPanel,
  editTicketPanel,
  sendExchangerPanel,
};
