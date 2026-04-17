const { SlashCommandBuilder } = require('discord.js');
const { showPayment } = require('../util/showPaymentEmbed');

module.exports = {
  name: 'solana',
  aliases: ['sol'],
  description: 'Fiche Solana',
  slashData: new SlashCommandBuilder()
    .setName('solana')
    .setDescription('Afficher la fiche Solana')
    .addStringOption((o) =>
      o.setName('produit').setDescription('Nom du produit enregistré').setRequired(false)
    ),
  async executeSlash(interaction) {
    const prod = interaction.options.getString('produit');
    await showPayment(interaction, 'solana', prod);
  },
  async executePrefix(message, args) {
    const prod = args[0];
    await showPayment(message, 'solana', prod);
  },
};
