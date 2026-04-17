const { embedFromConfig } = require('./embeds');
const { getConfig } = require('./permissions');
const { EmbedBuilder } = require('discord.js');

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

  if (productName) {
    const prix = cfg.products?.get(productName.toLowerCase());
    if (prix !== undefined) {
      embedData.title = `${embedData.title || ''} - ${productName.toUpperCase()}`.trim();
      if (!embedData.fields) embedData.fields = [];
      embedData.fields.push({
        name: 'Produit',
        value: productName.toUpperCase(),
        inline: true
      });
      embedData.fields.push({
        name: 'Prix',
        value: `${prix}€`,
        inline: true
      });
    }
  }

  const embed = embedFromConfig(embedData);
  if (context.reply) {
    if (context.deferred || context.replied) await context.editReply({ embeds: [embed] });
    else await context.reply({ embeds: [embed] });
  } else {
    await context.reply({ embeds: [embed] });
  }
}

module.exports = { showPayment };
