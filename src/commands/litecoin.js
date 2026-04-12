const { showPayment } = require('../util/showPaymentEmbed');

module.exports = {
  name: 'litecoin',
  aliases: ['ltc'],
  description: 'Fiche Litecoin',
  async executePrefix(message) {
    await showPayment(message, 'litecoin');
  },
};
