const { showPayment } = require('../util/showPaymentEmbed');

module.exports = {
  name: 'solana',
  aliases: ['sol'],
  description: 'Fiche Solana',
  async executePrefix(message) {
    await showPayment(message, 'solana');
  },
};
