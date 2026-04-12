require('dotenv').config();
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

const token = firstEnv('DISCORD_TOKEN', 'BOT_TOKEN', 'DISCORD_BOT_TOKEN');
const clientId = firstEnv('CLIENT_ID', 'DISCORD_CLIENT_ID', 'APPLICATION_ID');
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error(
    'Pour publier les / : définis le token (DISCORD_TOKEN ou BOT_TOKEN) et CLIENT_ID (ID de l’application Discord).'
  );
  process.exit(1);
}

const commands = [];
const dir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const mod = require(path.join(dir, file));
  if (mod.slashData) commands.push(mod.slashData.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(`Slash (guild ${guildId}) : ${commands.length} commandes.`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log(`Slash (global) : ${commands.length} commandes (propagation ~1h).`);
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
