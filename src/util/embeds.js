const { EmbedBuilder } = require('discord.js');

/**
 * @param {object} raw
 * @returns {EmbedBuilder}
 */
function embedFromConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return new EmbedBuilder().setDescription('*(embed vide)*');
  }
  const e = new EmbedBuilder();
  if (raw.title) e.setTitle(raw.title);
  if (raw.description) e.setDescription(raw.description);
  if (typeof raw.color === 'number') e.setColor(raw.color);
  if (raw.image) e.setImage(raw.image);
  if (raw.thumbnail) e.setThumbnail(raw.thumbnail);
  if (raw.footer) e.setFooter({ text: raw.footer });
  if (Array.isArray(raw.fields)) {
    for (const f of raw.fields.slice(0, 25)) {
      e.addFields({
        name: (f.name || '\u200b').slice(0, 256),
        value: (f.value || '\u200b').slice(0, 1024),
        inline: !!f.inline,
      });
    }
  }
  return e;
}

function parseHexColor(input) {
  if (!input) return null;
  const s = String(input).replace(/^#/, '');
  const n = parseInt(s, 16);
  if (Number.isNaN(n) || s.length < 6) return null;
  return n;
}

module.exports = { embedFromConfig, parseHexColor };
