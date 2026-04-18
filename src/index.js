require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { connectMongo } = require('./util/db');
const { loadCommands } = require('./loader');

function firstEnv(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/** Token bot (même nom sur Railway que en local si tu l’ajoutes à la main) */
const token = firstEnv('DISCORD_TOKEN', 'BOT_TOKEN', 'DISCORD_BOT_TOKEN');
/** Mongo : Railway plugin Mongo met souvent DATABASE_URL ; toi tu peux forcer MONGO_URL */
const mongo = firstEnv('MONGO_URL', 'DATABASE_URL', 'MONGODB_URI', 'MONGO_URI');

if (!token || !mongo) {
  console.error('[Ohio Machine] Variables d’environnement manquantes sur ce service Railway :');
  if (!token) {
    console.error('  • Token Discord : définis DISCORD_TOKEN (le secret du bot, portail développeur).');
  }
  if (!mongo) {
    console.error(
      '  • MongoDB : définis MONGO_URL ou branche le plugin Mongo et utilise sa variable (souvent DATABASE_URL).'
    );
    console.error(
      '    Vérifie que les variables sont sur le MÊME service que celui qui exécute "npm start", pas seulement sur la base.'
    );
  }
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

loadCommands(client);

const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const ev = require(path.join(eventsPath, file));
  if (ev.once) {
    client.once(ev.name, (...args) => ev.execute(...args, client));
  } else {
    client.on(ev.name, (...args) => ev.execute(...args, client));
  }
}

(async () => {
  await connectMongo(mongo);
  try {
    const { registerSlashCommands } = require('./registerSlashCommands');
    await registerSlashCommands();
  } catch (e) {
    console.error('[Ohio Machine] Enregistrement des commandes / :', e.message || e);
  }
  await client.login(token);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
