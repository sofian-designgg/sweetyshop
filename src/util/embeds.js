const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  isJSONEncodable,
} = require('discord.js');

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
  if (raw.footer) {
    e.setFooter({
      text: raw.footer,
      iconURL: raw.footerIcon || undefined,
    });
  }
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

/**
 * Crée un bouton à partir d'une config
 */
function createButtonFromConfig(comp, index) {
  const btn = new ButtonBuilder()
    .setLabel((comp.label || 'Bouton').slice(0, 80))
    .setStyle(ButtonStyle[comp.style] || ButtonStyle.Primary);

  if (comp.url) {
    btn.setURL(comp.url);
    btn.setStyle(ButtonStyle.Link);
  } else {
    btn.setCustomId(comp.customId || comp.id || `btn_${index}`);
  }

  if (comp.emoji) {
    const customEmojiMatch = comp.emoji.match(/<?(?:a:)?\w+:(\d+)>?/);
    if (customEmojiMatch) btn.setEmoji(customEmojiMatch[1]);
    else btn.setEmoji(comp.emoji);
  }

  return btn;
}

/**
 * Transforme une config JSON en Components V2 (Container avec sections et boutons intégrés)
 * @param {object} raw
 * @returns {object} { components: [ContainerBuilder] } ou { embeds: [], components: [] } pour fallback
 */
function messageFromConfig(raw) {
  if (!raw || typeof raw !== 'object') return { content: '*(vide)*' };

  // Si useComponentsV2 est false ou non défini, utiliser l'ancien système
  if (raw.useComponentsV2 === false) {
    return messageFromConfigLegacy(raw);
  }

  // Création du Container V2
  const container = new ContainerBuilder();

  // Ajout du thumbnail en header si présent
  if (raw.thumbnail || raw.headerThumbnail) {
    try {
      const thumbUrl = raw.thumbnail || raw.headerThumbnail;
      const thumbnail = new ThumbnailBuilder({
        media: { url: thumbUrl },
      });
      container.addThumbnail(thumbnail);
    } catch (e) {
      console.error('Erreur thumbnail:', e.message);
    }
  }

  // Couleur d'accentuation
  if (typeof raw.color === 'number' || raw.accentColor) {
    const accentColor = typeof raw.color === 'number' ? raw.color : parseHexColor(raw.accentColor);
    if (accentColor != null) {
      container.setAccentColor(accentColor);
    }
  }

  // Titre comme premier texte
  if (raw.title) {
    const titleSection = new SectionBuilder({
      components: [new TextDisplayBuilder({ content: `## ${raw.title}` })]
    });
    container.addComponents(titleSection);
  }

  // Description principale
  if (raw.description) {
    const descSection = new SectionBuilder({
      components: [new TextDisplayBuilder({ content: raw.description.slice(0, 4000) })]
    });
    container.addComponents(descSection);
  }

  // Séparateur après le texte initial
  if ((raw.title || raw.description) && (raw.fields?.length > 0 || raw.sections?.length > 0 || raw.components?.length > 0)) {
    container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  }

  // Gestion des sections avec boutons intégrés (Components V2 style)
  if (Array.isArray(raw.sections)) {
    for (const section of raw.sections.slice(0, 10)) {
      const sectionBuilder = new SectionBuilder();

      // Texte de la section
      if (section.text || section.description) {
        const textComponent = new TextDisplayBuilder({
          content: (section.text || section.description).slice(0, 1024),
        });
        sectionBuilder.addComponents(textComponent);
      }

      // Thumbnail de la section
      if (section.thumbnail || section.image) {
        try {
          const sectionThumb = new ThumbnailBuilder({
            media: { url: section.thumbnail || section.image },
          });
          sectionBuilder.setThumbnail(sectionThumb);
        } catch (e) {
          console.error('Erreur section thumbnail:', e.message);
        }
      }

      // Bouton accessory (intégré dans la section)
      if (section.button) {
        const btn = createButtonFromConfig(section.button, 0);
        sectionBuilder.setAccessory(btn);
      }

      container.addComponents(sectionBuilder);
    }
  }

  // Fallback: Convertir les fields en sections avec boutons si applicable
  if (Array.isArray(raw.fields) && !raw.sections) {
    for (let i = 0; i < Math.min(raw.fields.length, 10); i++) {
      const field = raw.fields[i];
      const sectionBuilder = new SectionBuilder();

      const fieldText = new TextDisplayBuilder({
        content: `**${field.name || '\u200b'}**\n${field.value || '\u200b'}`.slice(0, 1024),
      });
      sectionBuilder.addComponents(fieldText);

      container.addComponents(sectionBuilder);
    }
  }

  // Gestion des boutons standalone (en dessous des sections)
  if (Array.isArray(raw.components)) {
    const buttons = raw.components
      .filter((c) => c.type === 'button')
      .slice(0, 5) // Max 5 boutons dans une rangée
      .map((comp, idx) => createButtonFromConfig(comp, idx));

    if (buttons.length > 0) {
      // En Components V2, les boutons peuvent être ajoutés directement au container
      // ou dans une ActionRow pour le style traditionnel
      const row = new ActionRowBuilder().addComponents(buttons);
      container.addActionRow(row);
    }
  }

  // Image principale en bas (gallery)
  if (raw.image || raw.gallery?.length > 0) {
    const galleryItems = [];

    if (raw.image) {
      galleryItems.push(new MediaGalleryItemBuilder({ media: { url: raw.image } }));
    }

    if (Array.isArray(raw.gallery)) {
      for (const img of raw.gallery.slice(0, 10)) {
        if (typeof img === 'string') {
          galleryItems.push(new MediaGalleryItemBuilder({ media: { url: img } }));
        } else if (img.url) {
          galleryItems.push(new MediaGalleryItemBuilder({
            media: { url: img.url },
            description: img.description,
          }));
        }
      }
    }

    if (galleryItems.length > 0) {
      const gallery = new MediaGalleryBuilder();
      galleryItems.forEach((item) => gallery.addItem(item));
      container.addMediaGallery(gallery);
    }
  }

  // Footer textuel en bas
  if (raw.footer) {
    container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    const footerSection = new SectionBuilder({
      components: [new TextDisplayBuilder({ content: `*${raw.footer.slice(0, 2048)}*` })]
    });
    container.addComponents(footerSection);
  }

  return { components: [container] };
}

/**
 * Ancienne méthode pour fallback
 */
function messageFromConfigLegacy(raw) {
  const embed = embedFromConfig(raw);
  const components = [];

  if (Array.isArray(raw.components)) {
    let currentRow = new ActionRowBuilder();

    raw.components.forEach((comp, index) => {
      if (comp.type === 'button') {
        const btn = createButtonFromConfig(comp, index);
        currentRow.addComponents(btn);

        if (currentRow.components.length === 5 || index === raw.components.length - 1) {
          components.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
      }
    });
  }

  return { embeds: [embed], components: components.length > 0 ? components : [] };
}

/**
 * Construit un panel de tickets avec Components V2
 * Les boutons sont intégrés dans des sections avec du texte
 */
function buildTicketPanelV2(cfg, guildName) {
  const container = new ContainerBuilder();

  // Couleur d'accentuation
  const accentColor = cfg.ticketPanelEmbed?.color || 0x5865f2;
  container.setAccentColor(accentColor);

  // Header avec thumbnail optionnel
  if (cfg.ticketPanelEmbed?.thumbnail) {
    try {
      const thumbnail = new ThumbnailBuilder({
        media: { url: cfg.ticketPanelEmbed.thumbnail },
      });
      container.addThumbnail(thumbnail);
    } catch (e) {
      console.error('Erreur thumbnail panel:', e.message);
    }
  }

  // Titre
  const title = cfg.ticketPanelEmbed?.title || '🎫 Support';
  const titleSection = new SectionBuilder({
    components: [new TextDisplayBuilder({ content: `## ${title}` })]
  });
  container.addComponents(titleSection);

  // Description
  const description = cfg.ticketPanelEmbed?.description || `Bienvenue sur **${guildName}**. Choisis l'option qui correspond à ton besoin.`;
  const descSection = new SectionBuilder({
    components: [new TextDisplayBuilder({ content: description.slice(0, 4000) })]
  });
  container.addSection(descSection);

  container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Medium));

  // Catégories sous forme de sections avec boutons accessory
  const cats = [...(cfg.ticketCategories || [])].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return 0;
  });

  for (const c of cats.slice(0, 10)) {
    const section = new SectionBuilder();

    // Texte de la section
    const prompt = c.prompt || c.label;
    const hint = c.hint || 'Clique pour ouvrir un ticket';
    const sectionText = new TextDisplayBuilder({
      content: `**${prompt}**\n${hint}`.slice(0, 1024),
    });
    section.addComponents(sectionText);

    // Bouton accessory intégré dans la section
    const style = ButtonStyle[c.style] || ButtonStyle.Secondary;
    const btn = new ButtonBuilder()
      .setCustomId(`ticket:open:${c.id}`)
      .setLabel(c.label.slice(0, 80))
      .setStyle(style);

    if (c.emoji) {
      const customEmojiMatch = c.emoji.match(/<?(?:a:)?\w+:(\d+)>?/);
      if (customEmojiMatch) btn.setEmoji(customEmojiMatch[1]);
      else btn.setEmoji(c.emoji);
    }

    section.setAccessory(btn);
    container.addComponents(section);
  }

  // Image du panel si présente
  if (cfg.ticketPanelEmbed?.image) {
    container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    const gallery = new MediaGalleryBuilder().addItem(
      new MediaGalleryItemBuilder({ media: { url: cfg.ticketPanelEmbed.image } })
    );
    container.addMediaGallery(gallery);
  }

  // Footer
  if (cfg.ticketPanelEmbed?.footer) {
    container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    const footerSection = new SectionBuilder({
      components: [new TextDisplayBuilder({ content: `*${cfg.ticketPanelEmbed.footer.slice(0, 2048)}*` })]
    });
    container.addComponents(footerSection);
  }

  return { components: [container] };
}

/**
 * Construit un panel d'exchanger avec Components V2
 */
function buildExchangerPanelV2(cfg) {
  const container = new ContainerBuilder();
  const exchangerCfg = cfg.exchangerConfig || {};

  // Couleur et header
  const accentColor = exchangerCfg.embed?.color || 0x5865f2;
  container.setAccentColor(accentColor);

  if (exchangerCfg.embed?.thumbnail) {
    try {
      const thumbnail = new ThumbnailBuilder({
        media: { url: exchangerCfg.embed.thumbnail },
      });
      container.addThumbnail(thumbnail);
    } catch (e) {
      console.error('Erreur thumbnail exchanger:', e.message);
    }
  }

  // Titre
  const title = exchangerCfg.embed?.title || '💱 Exchanger';
  const titleSection = new SectionBuilder({
    components: [new TextDisplayBuilder({ content: `## ${title}` })]
  });
  container.addComponents(titleSection);

  // Description
  const description = exchangerCfg.embed?.description || 'Sélectionne une paire pour voir le taux et faire un échange.';
  const descSection = new SectionBuilder({
    components: [new TextDisplayBuilder({ content: description.slice(0, 4000) })]
  });
  container.addSection(descSection);

  container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Medium));

  // Taux de change en sections avec boutons
  const rates = exchangerCfg.rates || {};
  const rateEntries = Object.entries(rates).slice(0, 10);

  for (const [pair, rateData] of rateEntries) {
    const section = new SectionBuilder();

    const rateValue = typeof rateData === 'number' ? rateData : rateData.rate;
    const emoji = typeof rateData === 'object' ? rateData.emoji : '💱';
    const desc = typeof rateData === 'object' ? rateData.description : '';

    const percent = Math.round((1 - rateValue) * 100);
    const feeText = percent > 0 ? `(-${percent}% frais)` : percent < 0 ? `(+${Math.abs(percent)}% bonus)` : '';

    const sectionText = new TextDisplayBuilder({
      content: `${emoji} **${pair.toUpperCase()}** ${feeText}\n${desc || `Taux: ${rateValue}`}`.slice(0, 1024),
    });
    section.addComponents(sectionText);

    // Bouton pour sélectionner cette paire
    const btn = new ButtonBuilder()
      .setCustomId(`exchanger:select:${pair}`)
      .setLabel('Échanger')
      .setStyle(ButtonStyle.Primary);

    section.setAccessory(btn);
    container.addComponents(section);
  }

  return { components: [container] };
}

function parseHexColor(input) {
  if (!input) return null;
  const s = String(input).replace(/^#/, '');
  const n = parseInt(s, 16);
  if (Number.isNaN(n) || s.length < 6) return null;
  return n;
}

module.exports = {
  embedFromConfig,
  messageFromConfig,
  messageFromConfigLegacy,
  buildTicketPanelV2,
  buildExchangerPanelV2,
  createButtonFromConfig,
  parseHexColor,
};
