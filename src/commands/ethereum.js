const { SlashCommandBuilder } = require('discord.js');
const { showPayment } = require('../util/showPaymentEmbed');

module.exports = {
  name: 'ethereum',
  aliases: ['eth'],
  description: 'Fiche Ethereum',
  slashData: new SlashCommandBuilder()
    .setName('ethereum')
    .setDescription('Afficher la fiche Ethereum')
    .addStringOption((o) =>
      o.setName('produit').setDescription('Nom du produit enregistré').setRequired(false)
    ),
  async executeSlash(interaction) {
    const prod = interaction.options.getString('produit');
    await showPayment(interaction, 'ethereum', prod);
  },
  async executePrefix(message, args) {
    const prod = args[0];
    await showPayment(message, 'ethereum', prod);
  },
};
