const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { embedFromConfig } = require('./embeds');

const STYLE_MAP = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger,
};

/**
 * Construit l'embed + les rangées de boutons (max 5 rangées Discord).
 * Les catégories sont groupées par `row` puis ordre d'insertion.
 */
function buildTicketPanel(cfg, guildName) {
  const base = cfg.ticketPanelEmbed || {};
  const embed = embedFromConfig({
    ...base,
    description: base.description || `Bienvenue sur **${guildName}**. Choisis l’option qui correspond à ton besoin.`,
  });

  const cats = [...(cfg.ticketCategories || [])].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return 0;
  });

  const rowsMap = new Map();
  for (const c of cats) {
    const r = Math.min(4, Math.max(0, c.row ?? 0));
    if (!rowsMap.has(r)) rowsMap.set(r, []);
    const arr = rowsMap.get(r);
    if (arr.length >= 5) continue;
    arr.push(c);
  }

  const sortedRows = [...rowsMap.keys()].sort((a, b) => a - b).slice(0, 5);
  const actionRows = [];

  for (const rowIndex of sortedRows) {
    const list = rowsMap.get(rowIndex);
    const row = new ActionRowBuilder();
    for (const c of list) {
      const style = STYLE_MAP[c.style] ?? ButtonStyle.Secondary;
      const label = (c.label || 'Ticket').slice(0, 80);
      const btn = new ButtonBuilder()
        .setCustomId(`ticket:open:${c.id}`)
        .setLabel(label)
        .setStyle(style);
      if (c.emoji) {
        try {
          btn.setEmoji(c.emoji);
        } catch {
          /* emoji invalide ignoré */
        }
      }
      row.addComponents(btn);
    }
    if (row.components.length) actionRows.push(row);
  }

  return { embeds: [embed], components: actionRows };
}

/**
 * Texte du corps d'embed façon « une ligne par catégorie » (comme ton exemple).
 */
function enrichPanelDescription(embed, categories) {
  if (!categories?.length) return embed;
  const lines = categories.map((c) => {
    const title = c.prompt ? `**${c.prompt}**` : `**${c.label}**`;
    const hint = c.hint || '';
    return `${title}\n*${hint}*`;
  });
  const block = lines.join('\n\n');
  const current = embed.data.description || '';
  embed.setDescription(`${current}\n\n${block}`.trim());
  return embed;
}

module.exports = { buildTicketPanel, enrichPanelDescription, STYLE_MAP };
