const { showPayment } = require('../util/showPaymentEmbed');

module.exports = {
  name: 'paypal',
  description: 'Fiche PayPal',
  async executePrefix(message) {
    await showPayment(message, 'paypal');
  },
};
