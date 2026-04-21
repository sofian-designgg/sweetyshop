require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Configuration du client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// Charger les commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ohio-bot')
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

// Schéma de configuration
const configSchema = new mongoose.Schema({
  guildId: String,
  ticketCategoryId: String,
  ticketChannelId: String,
  ticketMessageId: String,
  ticketCategories: [{
    id: String,
    label: String,
    emoji: String,
    description: String
  }],
  staffRoleIds: [String],
});

const Config = mongoose.model('Config', configSchema);

// Handler d'événements
client.once('ready', () => {
  console.log(`✅ Bot connecté: ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, Config);
  } catch (error) {
    console.error(error);
    const reply = { content: '❌ Une erreur est survenue.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Démarrer le bot
client.login(process.env.DISCORD_TOKEN);
