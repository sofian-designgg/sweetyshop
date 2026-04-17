const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, isConfigAdmin } = require('../util/permissions');

module.exports = {
  name: 'setproduit',
  description: 'Enregistrer un produit et son prix',
  slashData: new SlashCommandBuilder()
    .setName('setproduit')
    .setDescription('Enregistrer un produit et son prix')
    .addStringOption((o) =>
      o.setName('nom').setDescription('Nom du produit (ex: nitro)').setRequired(true)
    )
    .addNumberOption((o) =>
      o.setName('prix').setDescription('Prix en euros (ex: 5.50)').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction) {
    const cfg = await getConfig(interaction.guildId);
    const admin =
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      (await isConfigAdmin(interaction.member, cfg));

    if (!admin) {
      await interaction.reply({ content: 'Permission refusée.', ephemeral: true });
      return;
    }

    const nom = interaction.options.getString('nom', true).toLowerCase();
    const prix = interaction.options.getNumber('prix', true);

    if (!cfg.products) cfg.products = new Map();
    cfg.products.set(nom, prix);
    cfg.markModified('products');
    await cfg.save();

    await interaction.reply({
      content: `Produit **${nom}** enregistré avec le prix **${prix}€**.`,
      ephemeral: true,
    });
  },

  async executePrefix(message, args, { cfg }) {
    const admin =
      message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      (await isConfigAdmin(message.member, cfg));

    if (!admin) return message.reply('Permission refusée.');

    const nom = (args[0] || '').toLowerCase();
    const prix = parseFloat(args[1]);

    if (!nom || isNaN(prix)) {
      return message.reply('Usage : `+setproduit <nom> <prix>`');
    }

    if (!cfg.products) cfg.products = new Map();
    cfg.products.set(nom, prix);
    cfg.markModified('products');
    await cfg.save();

    await message.reply(`Produit **${nom}** enregistré à **${prix}€**.`);
  },
};
