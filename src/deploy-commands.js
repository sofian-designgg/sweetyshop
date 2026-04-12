require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('DISCORD_TOKEN et CLIENT_ID requis dans .env');
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
