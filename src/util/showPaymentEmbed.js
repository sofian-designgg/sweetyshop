const { messageFromConfig } = require('./embeds');
const { getConfig } = require('./permissions');
const {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');

async function showPayment(context, key, productName = null) {
  const guildId = context.guildId || context.guild?.id;
  const cfg = await getConfig(guildId);
  let raw = cfg.paymentEmbeds?.[key];

  if (!raw) {
    const msg = `Aucun embed **${key}**. Configure avec \`/paiement definir\`.`;
    if (context.reply) await context.reply({ content: msg, ephemeral: true });
    else await context.channel.send(msg);
    return;
  }

  // Clone to avoid modifying the original config in memory
  const embedData = JSON.parse(JSON.stringify(raw));

  // Construction avec Components V2
  const container = new ContainerBuilder();

  // Couleur d'accentuation
  if (typeof embedData.color === 'number') {
    container.setAccentColor(embedData.color);
  }

  // Thumbnail en header
  if (embedData.thumbnail) {
    try {
      const thumbnail = new ThumbnailBuilder({
        media: { url: embedData.thumbnail },
      });
      container.addThumbnail(thumbnail);
    } catch (e) {
      console.error('Erreur thumbnail paiement:', e.message);
    }
  }

  // Titre
  let titleText = embedData.title || key.toUpperCase();
  if (productName) {
    titleText += ` - ${productName.toUpperCase()}`;
  }
  container.addTextDisplay(new TextDisplayBuilder({ content: `## ${titleText.slice(0, 256)}` }));

  // Description
  if (embedData.description) {
    container.addTextDisplay(new TextDisplayBuilder({
      content: embedData.description.slice(0, 4000),
    }));
  }

  container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  // Section avec infos produit si applicable
  if (productName) {
    const prix = cfg.products?.get(productName.toLowerCase());
    if (prix !== undefined) {
      const section = new SectionBuilder();
      const sectionText = new TextDisplayBuilder({
        content: `**Produit:** ${productName.toUpperCase()}\n**Prix:** ${prix}€`.slice(0, 1024),
      });
      section.addTextDisplay(sectionText);

      // Bouton de paiement intégré
      const payBtn = new ButtonBuilder()
        .setCustomId(`payment:confirm:${key}:${productName}`)
        .setLabel(`Payer ${prix}€`)
        .setStyle(ButtonStyle.Success);
      section.setAccessory(payBtn);

      container.addSection(section);
      container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    }
  }

  // Image principale
  if (embedData.image) {
    try {
      const thumb = new ThumbnailBuilder({
        media: { url: embedData.image },
      });
      const section = new SectionBuilder();
      section.setThumbnail(thumb);
      container.addSection(section);
    } catch (e) {
      console.error('Erreur image paiement:', e.message);
    }
  }

  // Footer
  if (embedData.footer) {
    container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplay(new TextDisplayBuilder({
      content: `*${embedData.footer.slice(0, 2048)}*`,
    }));
  }

  const payload = { components: [container] };

  try {
    if (context.reply) {
      if (context.deferred || context.replied) await context.editReply(payload);
      else await context.reply(payload);
    } else {
      await context.reply(payload);
    }
  } catch (e) {
    console.error('Erreur envoi paiement V2:', e);
    // Fallback vers l'ancien système
    const fallback = messageFromConfig({ ...embedData, useComponentsV2: false });
    if (context.reply) {
      if (context.deferred || context.replied) await context.editReply(fallback);
      else await context.reply(fallback);
    } else {
      await context.reply(fallback);
    }
  }
}

module.exports = { showPayment };
