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
  console.log(`[Bot] ID: ${client.user.id}`);
  console.log(`[Commandes] ${slashCommands.length} commandes à enregistrer: ${slashCommands.map(c => c.name).join(', ')}`);
  
  // Connexion MongoDB
  await connectDB();
  
  // Attendre un peu que tout soit stable
  await new Promise(r => setTimeout(r, 1000));
  
  // Enregistrement global des commandes
  try {
    console.log('[Slash] Suppression des anciennes commandes...');
    await client.application.commands.set([]);
    console.log('[Slash] Anciennes commandes supprimées');
    
    await new Promise(r => setTimeout(r, 500));
    
    console.log('[Slash] Enregistrement des nouvelles commandes...');
    const result = await client.application.commands.set(slashCommands);
    console.log(`[Slash] ✅ ${result.size} commandes enregistrées:`);
    result.forEach(cmd => console.log(`  - /${cmd.name}`));
  } catch (error) {
    console.error('[Slash] ❌ Erreur enregistrement:', error.message);
    console.error(error.stack);
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
