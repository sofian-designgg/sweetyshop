require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { connectDB } = require('./database');
const fs = require('fs');
const path = require('path');

// Client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// Collections
client.commands = new Collection();

// Chargement des events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`[Event] Chargé: ${event.name}`);
}

// Chargement des commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const slashCommands = [];

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    slashCommands.push(command.data.toJSON());
    console.log(`[Commande] Chargée: ${command.data.name}`);
  }
}

// Enregistrement des slash commands
client.once('ready', async () => {
  console.log(`[Bot] Connecté en tant que ${client.user.tag}`);
  
  // Connexion MongoDB
  await connectDB();
  
  // Enregistrement global des commandes
  try {
    await client.application.commands.set(slashCommands);
    console.log(`[Slash] ${slashCommands.length} commandes enregistrées`);
  } catch (error) {
    console.error('[Slash] Erreur enregistrement:', error);
  }
});

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('[Erreur] Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('[Erreur] Uncaught Exception:', error);
});

// Connexion
client.login(process.env.DISCORD_TOKEN);
