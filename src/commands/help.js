const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getConfig } = require('../util/permissions');

const LINES = [
  '`+ping` / `/ping` — latence',
  '`+help` / `/help` — aide',
  '**Modération** — `+ban` `+kick` `+timeout` `+purge` `+warn` `+warnings` (+ équivalents `/`)',
  '**Tickets** — `/ticket` (panel, boutons) · `+ticket envoyer`',
  '**Config** — `+config` (salons, rôles, préfixe) · `/config afficher`',
  '**Paiement** — `/paiement afficher` · `+paypal` `+litecoin` `+ethereum` / `+eth` `+solana` / `+sol`',
  '**Avis** — `/avis demander` après livraison',
];

module.exports = {
  name: 'help',
  aliases: ['aide', 'commands'],
  description: 'Liste des commandes',
  slashData: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Aide du bot SweetyShop'),
  async executeSlash(interaction) {
    const cfg = await getConfig(interaction.guildId);
    const p = cfg.prefix || '+';
    const embed = new EmbedBuilder()
      .setTitle('SweetyShop — aide')
      .setColor(0x5865f2)
      .setDescription(
        `Préfixe : **${p}**\n\n` + LINES.join('\n')
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
  async executePrefix(message) {
    const cfg = await getConfig(message.guild.id);
    const p = cfg.prefix || '+';
    const embed = new EmbedBuilder()
      .setTitle('SweetyShop — aide')
      .setColor(0x5865f2)
      .setDescription(`Préfixe : **${p}**\n\n` + LINES.join('\n'));
    await message.reply({ embeds: [embed] });
  },
};
