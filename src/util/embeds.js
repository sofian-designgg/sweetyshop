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
  const label = comp?.label || 'Bouton';
  const style = comp?.style || 'Primary';
  
  const btn = new ButtonBuilder()
    .setLabel(String(label).slice(0, 80))
    .setStyle(ButtonStyle[style] || ButtonStyle.Primary);

  if (comp?.url) {
    btn.setURL(String(comp.url));
    btn.setStyle(ButtonStyle.Link);
  } else {
    const customId = comp?.customId || comp?.id || `btn_${index}`;
    btn.setCustomId(String(customId));
  }

  if (comp?.emoji) {
    const customEmojiMatch = String(comp.emoji).match(/<?(?:a:)?\w+:(\d+)>?/);
    if (customEmojiMatch) btn.setEmoji(customEmojiMatch[1]);
    else btn.setEmoji(String(comp.emoji));
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

  // Construction des composants pour le Container V2
  const containerComponents = [];

  // Titre comme premier texte
  if (raw.title) {
    containerComponents.push(new SectionBuilder({
      components: [new TextDisplayBuilder({ content: `## ${String(raw.title)}` })]
    }));
  }

  // Description principale
  if (raw.description) {
    containerComponents.push(new SectionBuilder({
      components: [new TextDisplayBuilder({ content: String(raw.description).slice(0, 4000) })]
    }));
  }

  // Séparateur après le texte initial
  if ((raw.title || raw.description) && (raw.fields?.length > 0 || raw.sections?.length > 0 || raw.components?.length > 0)) {
    containerComponents.push(new SeparatorBuilder().setSpacing(1)); // Small spacing = 1
  }

  // Gestion des sections avec boutons intégrés (Components V2 style)
  if (Array.isArray(raw.sections)) {
    for (const section of raw.sections.slice(0, 10)) {
      const sectionComponents = [];

      // Texte de la section
      if (section.text || section.description) {
        sectionComponents.push(new TextDisplayBuilder({
          content: String(section.text || section.description).slice(0, 1024),
        }));
      }

      const sectionBuilder = new SectionBuilder({
        components: sectionComponents
      });

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

      containerComponents.push(sectionBuilder);
    }
  }

  // Fallback: Convertir les fields en sections avec boutons si applicable
  if (Array.isArray(raw.fields) && !raw.sections) {
    for (let i = 0; i < Math.min(raw.fields.length, 10); i++) {
      const field = raw.fields[i];
      containerComponents.push(new SectionBuilder({
        components: [new TextDisplayBuilder({
          content: `**${String(field.name || '\u200b')}**\n${String(field.value || '\u200b')}`.slice(0, 1024),
        })]
      }));
    }
  }

  // Gestion des boutons standalone (en dessous des sections)
  if (Array.isArray(raw.components)) {
    const buttons = raw.components
      .filter((c) => c.type === 'button')
      .slice(0, 5)
      .map((comp, idx) => createButtonFromConfig(comp, idx));

    if (buttons.length > 0) {
      containerComponents.push(new ActionRowBuilder().addComponents(buttons));
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
      containerComponents.push(new MediaGalleryBuilder().addItems(...galleryItems));
    }
  }

  // Footer textuel en bas
  if (raw.footer) {
    containerComponents.push(new SeparatorBuilder().setSpacing(1)); // Small spacing = 1
    containerComponents.push(new SectionBuilder({
      components: [new TextDisplayBuilder({ content: `*${String(raw.footer).slice(0, 2048)}*` })]
    }));
  }

  // Création du Container avec tous les composants
  const container = new ContainerBuilder({
    components: containerComponents
  });

  // Couleur d'accentuation - s'assurer que c'est un nombre valide
  let accentColor = typeof raw.color === 'number' ? raw.color : parseHexColor(raw.accentColor);
  if (accentColor != null && !isNaN(accentColor)) {
    container.setAccentColor(accentColor);
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
  console.log('[buildTicketPanelV2] Démarrage...');
  console.log('[buildTicketPanelV2] cfg:', JSON.stringify({
    ticketPanelEmbed: cfg.ticketPanelEmbed,
    ticketCategoriesCount: cfg.ticketCategories?.length,
    ticketCategories: cfg.ticketCategories?.map(c => ({ id: c.id, label: c.label, style: c.style, row: c.row }))
  }, null, 2));

  const containerComponents = [];

  // Titre
  const title = cfg.ticketPanelEmbed?.title || '🎫 Support';
  console.log('[buildTicketPanelV2] Title:', title, '- type:', typeof title);
  containerComponents.push(new SectionBuilder({
    components: [new TextDisplayBuilder({ content: `## ${String(title)}` })]
  }));

  // Description
  const description = cfg.ticketPanelEmbed?.description || `Bienvenue sur **${guildName}**. Choisis l'option qui correspond à ton besoin.`;
  console.log('[buildTicketPanelV2] Description:', description?.slice(0, 50), '- type:', typeof description);
  containerComponents.push(new SectionBuilder({
    components: [new TextDisplayBuilder({ content: String(description).slice(0, 4000) })]
  }));

  containerComponents.push(new SeparatorBuilder().setSpacing(2)); // Medium spacing = 2

  // Catégories sous forme de sections avec boutons accessory
  const cats = [...(cfg.ticketCategories || [])].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return 0;
  });

  console.log('[buildTicketPanelV2] Nombre de catégories:', cats.length);

  for (let i = 0; i < cats.length && i < 10; i++) {
    const c = cats[i];
    console.log(`[buildTicketPanelV2] Catégorie ${i}:`, JSON.stringify(c));
    
    // Vérifier que l'ID et le label existent
    if (!c.id || !c.label) {
      console.log(`[buildTicketPanelV2] Catégorie ${i} ignorée: id ou label manquant`);
      continue;
    }
    
    // Texte de la section
    const prompt = c.prompt || c.label;
    const hint = c.hint || 'Clique pour ouvrir un ticket';
    
    console.log(`[buildTicketPanelV2] Création section - prompt: "${prompt}" (${typeof prompt}), hint: "${hint}" (${typeof hint})`);
    console.log(`[buildTicketPanelV2] c.style: "${c.style}" (${typeof c.style}), ButtonStyle[c.style]:`, ButtonStyle[c.style]);
    
    try {
      const section = new SectionBuilder({
        components: [new TextDisplayBuilder({
          content: `**${String(prompt)}**\n${String(hint)}`.slice(0, 1024),
        })]
      });

      // Bouton accessory intégré dans la section
      const styleValue = c.style || 'Secondary';
      const style = ButtonStyle[styleValue] || ButtonStyle.Secondary;
      console.log(`[buildTicketPanelV2] Style final:`, style);
      
      const customId = `ticket:open:${String(c.id)}`;
      const btnLabel = String(c.label).slice(0, 80);
      console.log(`[buildTicketPanelV2] Bouton - customId: "${customId}" (${typeof customId}), label: "${btnLabel}" (${typeof btnLabel})`);
      
      const btn = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(btnLabel)
        .setStyle(style);

      if (c.emoji) {
        const emojiStr = String(c.emoji);
        console.log(`[buildTicketPanelV2] Emoji: "${emojiStr}"`);
        const customEmojiMatch = emojiStr.match(/<?(?:a:)?\w+:(\d+)>?/);
        if (customEmojiMatch) btn.setEmoji(customEmojiMatch[1]);
        else btn.setEmoji(emojiStr);
      }

      section.setAccessory(btn);
      containerComponents.push(section);
      console.log(`[buildTicketPanelV2] Section ${i} ajoutée avec succès`);
    } catch (sectionErr) {
      console.error(`[buildTicketPanelV2] ERREUR section ${i}:`, sectionErr.message);
      console.error(`[buildTicketPanelV2] Stack:`, sectionErr.stack);
      throw sectionErr;
    }
  }

  // Image du panel si présente
  if (cfg.ticketPanelEmbed?.image) {
    containerComponents.push(new SeparatorBuilder().setSpacing(1)); // Small spacing = 1
    containerComponents.push(new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder({ media: { url: cfg.ticketPanelEmbed.image } })
    ));
  }

  // Footer
  if (cfg.ticketPanelEmbed?.footer) {
    containerComponents.push(new SeparatorBuilder().setSpacing(1)); // Small spacing = 1
    containerComponents.push(new SectionBuilder({
      components: [new TextDisplayBuilder({ content: `*${cfg.ticketPanelEmbed.footer.slice(0, 2048)}*` })]
    }));
  }

  // Création du Container avec tous les composants
  const container = new ContainerBuilder({
    components: containerComponents
  });

  // Couleur d'accentuation - s'assurer que c'est un nombre valide
  let accentColor = cfg.ticketPanelEmbed?.color;
  if (typeof accentColor !== 'number' || isNaN(accentColor)) {
    accentColor = 0x5865f2;
  }
  container.setAccentColor(accentColor);

  return { components: [container] };
}

/**
 * Construit un panel d'exchanger avec Components V2
 */
function buildExchangerPanelV2(cfg) {
  const containerComponents = [];
  const exchangerCfg = cfg.exchangerConfig || {};

  // Titre
  const title = exchangerCfg.embed?.title || '💱 Exchanger';
  containerComponents.push(new SectionBuilder({
    components: [new TextDisplayBuilder({ content: `## ${title}` })]
  }));

  // Description
  const description = exchangerCfg.embed?.description || 'Sélectionne une paire pour voir le taux et faire un échange.';
  containerComponents.push(new SectionBuilder({
    components: [new TextDisplayBuilder({ content: description.slice(0, 4000) })]
  }));

  containerComponents.push(new SeparatorBuilder().setSpacing(2)); // Medium spacing = 2

  // Taux de change en sections avec boutons
  const rates = exchangerCfg.rates || {};
  const rateEntries = Object.entries(rates).slice(0, 10);

  for (const [pair, rateData] of rateEntries) {
    // Vérifier que la paire existe
    if (!pair) continue;
    
    const rateValue = typeof rateData === 'number' ? rateData : (rateData?.rate || 1);
    const emoji = typeof rateData === 'object' && rateData ? (rateData.emoji || '💱') : '💱';
    const desc = typeof rateData === 'object' && rateData ? (rateData.description || '') : '';

    const percent = Math.round((1 - rateValue) * 100);
    const feeText = percent > 0 ? `(-${percent}% frais)` : percent < 0 ? `(+${Math.abs(percent)}% bonus)` : '';

    const section = new SectionBuilder({
      components: [new TextDisplayBuilder({
        content: `${emoji} **${String(pair).toUpperCase()}** ${feeText}\n${desc || `Taux: ${rateValue}`}`.slice(0, 1024),
      })]
    });

    // Bouton pour sélectionner cette paire
    const btn = new ButtonBuilder()
      .setCustomId(`exchanger:select:${String(pair)}`)
      .setLabel('Échanger')
      .setStyle(ButtonStyle.Primary);

    section.setAccessory(btn);
    containerComponents.push(section);
  }

  // Création du Container avec tous les composants
  const container = new ContainerBuilder({
    components: containerComponents
  });

  // Couleur - s'assurer que c'est un nombre valide
  let accentColor = exchangerCfg.embed?.color;
  if (typeof accentColor !== 'number' || isNaN(accentColor)) {
    accentColor = 0x5865f2;
  }
  container.setAccentColor(accentColor);

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
