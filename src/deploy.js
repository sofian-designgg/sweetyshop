require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`[Deploy] Commande chargée: ${command.data.name}`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deploy() {
  try {
    console.log('[Deploy] Début du déploiement...');
    
    // Supprimer TOUTES les commandes globales d'abord
    console.log('[Deploy] Suppression des anciennes commandes...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID || ''), { body: [] });
    console.log('[Deploy] Anciennes commandes supprimées');
    
    // Enregistrer les nouvelles commandes
    console.log('[Deploy] Enregistrement des nouvelles commandes...');
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID || ''),
      { body: commands }
    );
    
    console.log(`[Deploy] ✅ ${data.length} commandes enregistrées avec succès!`);
    console.log('[Deploy] Commandes:', data.map(c => c.name).join(', '));
  } catch (error) {
    console.error('[Deploy] ❌ Erreur:', error);
    process.exit(1);
  }
}

// Récupérer le CLIENT_ID si non défini
if (!process.env.CLIENT_ID) {
  console.log('[Deploy] CLIENT_ID non défini, récupération...');
  
  (async () => {
    try {
      const { Client, GatewayIntentBits } = require('discord.js');
      const client = new Client({ intents: [GatewayIntentBits.Guilds] });
      
      client.once('ready', async () => {
        process.env.CLIENT_ID = client.user.id;
        console.log(`[Deploy] CLIENT_ID récupéré: ${process.env.CLIENT_ID}`);
        await deploy();
        process.exit(0);
      });
      
      await client.login(process.env.DISCORD_TOKEN);
    } catch (err) {
      console.error('[Deploy] Impossible de récupérer CLIENT_ID:', err);
      process.exit(1);
    }
  })();
} else {
  deploy();
}
