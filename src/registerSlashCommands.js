const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

function firstEnv(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/**
 * Publie les commandes slash auprès de Discord (même logique que npm run deploy).
 * @param {{ required?: boolean }} opts - required=true → throw si token/clientId manquant (CLI)
 */
async function registerSlashCommands(opts = {}) {
  const { required = false } = opts;
  const token = firstEnv('DISCORD_TOKEN', 'BOT_TOKEN', 'DISCORD_BOT_TOKEN');
  const clientId = firstEnv('CLIENT_ID', 'DISCORD_CLIENT_ID', 'APPLICATION_ID');
  const guildId = process.env.GUILD_ID?.trim();

  if (!token || !clientId) {
    if (required) {
      throw new Error(
        'DISCORD_TOKEN (ou BOT_TOKEN) et CLIENT_ID sont requis pour publier les commandes /.'
      );
    }
    if (!clientId) {
      console.log(
        '[SweetyShop] CLIENT_ID absent — commandes / non publiées. Ajoute CLIENT_ID (et GUILD_ID pour effet immédiat) sur Railway.'
      );
    }
    return;
  }

  if (/^(1|true|yes)$/i.test(process.env.SKIP_SLASH_DEPLOY || '')) {
    console.log('[SweetyShop] SKIP_SLASH_DEPLOY : enregistrement des / ignoré.');
    return;
  }

  const commands = [];
  const dir = path.join(__dirname, 'commands');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const mod = require(path.join(dir, file));
    if (mod.slashData) commands.push(mod.slashData.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(token);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(`[SweetyShop] Slash enregistrées (serveur ${guildId}) : ${commands.length} commandes.`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(
      `[SweetyShop] Slash enregistrées (global) : ${commands.length} commandes — propagation jusqu’à ~1 h.`
    );
  }
}

module.exports = { registerSlashCommands, firstEnv };
