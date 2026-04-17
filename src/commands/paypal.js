const { SlashCommandBuilder } = require('discord.js');
const { showPayment } = require('../util/showPaymentEmbed');

module.exports = {
  name: 'paypal',
  description: 'Fiche PayPal',
  slashData: new SlashCommandBuilder()
    .setName('paypal')
    .setDescription('Afficher la fiche PayPal')
    .addStringOption((o) =>
      o.setName('produit').setDescription('Nom du produit enregistré').setRequired(false)
    ),
  async executeSlash(interaction) {
    const prod = interaction.options.getString('produit');
    await showPayment(interaction, 'paypal', prod);
  },
  async executePrefix(message, args) {
    const prod = args[0];
    await showPayment(message, 'paypal', prod);
  },
};
