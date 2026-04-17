const { SlashCommandBuilder } = require('discord.js');
const { showPayment } = require('../util/showPaymentEmbed');

module.exports = {
  name: 'litecoin',
  aliases: ['ltc'],
  description: 'Fiche Litecoin',
  slashData: new SlashCommandBuilder()
    .setName('litecoin')
    .setDescription('Afficher la fiche Litecoin')
    .addStringOption((o) =>
      o.setName('produit').setDescription('Nom du produit enregistré').setRequired(false)
    ),
  async executeSlash(interaction) {
    const prod = interaction.options.getString('produit');
    await showPayment(interaction, 'litecoin', prod);
  },
  async executePrefix(message, args) {
    const prod = args[0];
    await showPayment(message, 'litecoin', prod);
  },
};
