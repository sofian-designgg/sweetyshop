const { embedFromConfig } = require('./embeds');
const { getConfig } = require('./permissions');

async function showPayment(message, key) {
  const cfg = await getConfig(message.guild.id);
  const raw = cfg.paymentEmbeds?.[key];
  if (!raw) {
    await message.reply(
      `Aucun embed **${key}**. Configure avec \`+config paiement\` ou \`/paiement definir\`.`
    );
    return;
  }
  await message.reply({ embeds: [embedFromConfig(raw)] });
}

module.exports = { showPayment };
