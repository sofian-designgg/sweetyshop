const { showPayment } = require('../util/showPaymentEmbed');

module.exports = {
  name: 'ethereum',
  aliases: ['eth'],
  description: 'Fiche Ethereum',
  async executePrefix(message) {
    await showPayment(message, 'ethereum');
  },
};
