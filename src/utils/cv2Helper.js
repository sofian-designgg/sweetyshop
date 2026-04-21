/**
 * Helper pour Components V2 - Envoie des requêtes HTTP directement à l'API Discord
 * Comme le bot DMall Python
 */

const { Routes } = require('discord.js');

// Type IDs pour Components V2
const TYPE = {
  ACTION_ROW: 1,
  BUTTON: 2,
  STRING_SELECT: 3,
  TEXT_INPUT: 4,
  USER_SELECT: 5,
  ROLE_SELECT: 6,
  MENTIONABLE_SELECT: 7,
  CHANNEL_SELECT: 8,
  SECTION: 9,
  TEXT_DISPLAY: 10,
  THUMBNAIL: 11,
  MEDIA_GALLERY: 12,
  FILE: 13,
  SEPARATOR: 14,
  CONTAINER: 17,
};

// Flag IS_COMPONENTS_V2
const IS_COMPONENTS_V2 = 32768;

// Créer un container
function container(...components) {
  const options = {};
  const last = components[components.length - 1];
  
  if (typeof last === 'object' && !Array.isArray(last) && !last.type) {
    // C'est des options (accent_color, etc.)
    Object.assign(options, last);
    components = components.slice(0, -1);
  }
  
  return {
    type: TYPE.CONTAINER,
    components: components.filter(c => c),
    accent_color: options.accent_color ?? options.accentColor ?? null,
  };
}

// Créer du texte
function text(content) {
  return {
    type: TYPE.TEXT_DISPLAY,
    content: String(content || '\u200b'),
  };
}

// Créer une section avec un accessoire optionnel
function section(textContent, accessory = null) {
  const components = [];
  
  if (typeof textContent === 'string') {
    components.push(text(textContent));
  } else if (Array.isArray(textContent)) {
    components.push(...textContent);
  } else if (textContent) {
    components.push(textContent);
  }
  
  const section = {
    type: TYPE.SECTION,
    components: components.filter(c => c),
  };
  
  if (accessory) {
    section.accessory = accessory;
  }
  
  return section;
}

// Créer un bouton lien
function link_button(label, url) {
  return {
    type: TYPE.BUTTON,
    style: 5, // Link
    label: String(label || 'Link'),
    url: String(url || 'https://discord.com'),
  };
}

// Créer un bouton action
function button(customId, label, style = 2, emoji = null) {
  const btn = {
    type: TYPE.BUTTON,
    style: style, // 1=Primary, 2=Secondary, 3=Success, 4=Danger
    label: String(label || 'Button'),
    custom_id: String(customId),
  };
  
  if (emoji) {
    // Emoji personnalisé: extraire l'ID
    const match = String(emoji).match(/:(\d+)>?$/);
    if (match) {
      btn.emoji = { id: match[1] };
    } else {
      btn.emoji = { name: emoji };
    }
  }
  
  return btn;
}

// Créer un séparateur
function separator(spacing = 1) {
  return {
    type: TYPE.SEPARATOR,
    spacing: spacing, // 1=Small, 2=Medium
  };
}

// Créer une action row (pour les boutons qui ne sont pas dans une section)
function action_row(...buttons) {
  return {
    type: TYPE.ACTION_ROW,
    components: buttons.filter(b => b),
  };
}

// Créer un thumbnail
function thumbnail(url) {
  return {
    type: TYPE.THUMBNAIL,
    media: { url: String(url) },
  };
}

// Créer une media gallery
function media_gallery(urls) {
  const items = (Array.isArray(urls) ? urls : [urls]).map(url => ({
    media: { url: String(url) },
  }));
  
  return {
    type: TYPE.MEDIA_GALLERY,
    items: items,
  };
}

// Envoyer un message avec Components V2
async function sendChannelV2(client, channelId, containerObj, content = null) {
  const rest = client.rest;
  
  const body = {
    flags: IS_COMPONENTS_V2,
    components: [containerObj],
  };
  
  if (content) {
    body.content = content;
  }
  
  try {
    const result = await rest.post(Routes.channelMessages(channelId), {
      body: body,
    });
    return result;
  } catch (error) {
    console.error('[CV2] Erreur envoi:', error);
    throw error;
  }
}

// Modifier un message avec Components V2
async function editMessageV2(client, channelId, messageId, containerObj, content = null) {
  const rest = client.rest;
  
  const body = {
    flags: IS_COMPONENTS_V2,
    components: [containerObj],
  };
  
  if (content !== undefined) {
    body.content = content;
  }
  
  try {
    const result = await rest.patch(Routes.channelMessage(channelId, messageId), {
      body: body,
    });
    return result;
  } catch (error) {
    console.error('[CV2] Erreur modification:', error);
    throw error;
  }
}

module.exports = {
  TYPE,
  IS_COMPONENTS_V2,
  container,
  text,
  section,
  link_button,
  button,
  separator,
  action_row,
  thumbnail,
  media_gallery,
  sendChannelV2,
  editMessageV2,
};
