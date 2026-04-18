const { defaultTicketCategories, defaultPaymentEmbeds } = require('./defaults');

async function seedGuildIfNeeded(doc) {
  let changed = false;
  // On ne force plus de catégories par défaut si c'est vide, 
  // car l'utilisateur veut un panel vierge.
  if (doc.ticketCategories === undefined) {
    doc.ticketCategories = [];
    changed = true;
  }
  
  if (!doc.paymentEmbeds || typeof doc.paymentEmbeds !== 'object') {
    doc.paymentEmbeds = defaultPaymentEmbeds();
    changed = true;
  }
  
  if (!doc.ticketPanelEmbed || !Object.keys(doc.ticketPanelEmbed).length) {
    doc.ticketPanelEmbed = {
      title: 'Support',
      description: 'Cliquez sur un bouton pour ouvrir un ticket.',
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
