const { buildTicketPanelV2 } = require('./embeds');

const STYLE_MAP = {
  Primary: 1,
  Secondary: 2,
  Success: 3,
  Danger: 4,
};

/**
 * Construit le panel de tickets avec Components V2.
 * Les boutons sont intégrés dans des sections avec le texte.
 * @deprecated Utilise directement buildTicketPanelV2 depuis embeds.js
 */
function buildTicketPanel(cfg, guildName) {
  // Utilise la nouvelle implémentation Components V2
  return buildTicketPanelV2(cfg, guildName);
}

/**
 * Fonction legacy - non utilisée avec Components V2
 * Gardée pour compatibilité
 */
function enrichPanelDescription(embed, categories) {
  // Les sections sont maintenant gérées nativement par Components V2
  return embed;
}

module.exports = { buildTicketPanel, enrichPanelDescription, STYLE_MAP };
