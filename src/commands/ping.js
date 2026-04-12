const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'ping',
  aliases: ['latence'],
  description: 'Affiche la latence du bot',
  slashData: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Latence du bot'),
  async executeSlash(interaction) {
    const sent = await interaction.reply({ content: 'Pong…', fetchReply: true });
    const ws = interaction.client.ws.ping;
    const rest = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong — API \`${rest}ms\` · WS \`${ws}ms\``);
  },
  async executePrefix(message) {
    const m = await message.reply('Pong…');
    const ws = message.client.ws.ping;
    const rest = m.createdTimestamp - message.createdTimestamp;
    await m.edit(`Pong — API \`${rest}ms\` · WS \`${ws}ms\``);
  },
};
