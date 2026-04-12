require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { connectMongo } = require('./util/db');
const { loadCommands } = require('./loader');

const token = process.env.DISCORD_TOKEN;
const mongo = process.env.MONGO_URL;

if (!token || !mongo) {
  console.error('Variables manquantes : DISCORD_TOKEN, MONGO_URL');
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
  await client.login(token);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
