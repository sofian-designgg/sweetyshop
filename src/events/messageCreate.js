const { getConfig } = require('../util/permissions');

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;
    const cfg = await getConfig(message.guild.id);
    const prefix = cfg.prefix || '+';
    if (!message.content.startsWith(prefix)) return;

    const without = message.content.slice(prefix.length).trim();
    if (!without) return;
    const args = without.split(/\s+/);
    const name = args.shift().toLowerCase();
    const cmd = client.prefixCommands.get(name);
    if (!cmd?.executePrefix) return;

    try {
      await cmd.executePrefix(message, args, { client, cfg });
    } catch (e) {
      console.error('prefix', name, e);
      await message.reply('Erreur en exécutant la commande.').catch(() => {});
    }
  },
};
