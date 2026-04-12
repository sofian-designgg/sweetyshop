const { defaultTicketCategories, defaultPaymentEmbeds } = require('./defaults');

async function seedGuildIfNeeded(doc) {
  let changed = false;
  if (!doc.ticketCategories?.length) {
    doc.ticketCategories = defaultTicketCategories();
    changed = true;
  }
  if (!doc.paymentEmbeds || typeof doc.paymentEmbeds !== 'object') {
    doc.paymentEmbeds = defaultPaymentEmbeds();
    changed = true;
  } else {
    const defs = defaultPaymentEmbeds();
    for (const [k, v] of Object.entries(defs)) {
      if (!doc.paymentEmbeds[k]) {
        doc.paymentEmbeds[k] = v;
        changed = true;
      }
    }
  }
  if (!doc.ticketPanelEmbed || !Object.keys(doc.ticketPanelEmbed).length) {
    doc.ticketPanelEmbed = {
      title: '🌊 Centre support',
      description: 'Sélectionne une option ci-dessous.',
      color: 0x5865f2,
    };
    changed = true;
  }
  if (changed) {
    doc.markModified('paymentEmbeds');
    doc.markModified('ticketCategories');
    doc.markModified('ticketPanelEmbed');
    await doc.save();
  }
  return doc;
}

module.exports = { seedGuildIfNeeded };
