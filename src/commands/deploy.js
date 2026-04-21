const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploy')
    .setDescription('Supprimer et redéployer toutes les commandes slash (ADMIN ONLY)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Charger toutes les commandes
      const commands = [];
      const commandsPath = path.join(__dirname);
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') && file !== 'deploy.js');

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        // Clear require cache pour recharger
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
        }
      }

      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

      // Supprimer TOUTES les commandes globales
      await interaction.editReply({
        content: '🗑️ Suppression des anciennes commandes en cours...'
      });

      await rest.put(
        Routes.applicationCommands(interaction.client.user.id),
        { body: [] }
      );

      // Enregistrer les nouvelles commandes
      await interaction.editReply({
        content: '📝 Enregistrement des nouvelles commandes...'
      });

      const data = await rest.put(
        Routes.applicationCommands(interaction.client.user.id),
        { body: commands }
      );

      const commandNames = data.map(c => c.name).join(', ');

      await interaction.editReply({
        content: `✅ **${data.length} commandes déployées avec succès !**\n\n📋 Commandes actives: ${commandNames}`
      });

    } catch (error) {
      console.error('[Deploy]', error);
      await interaction.editReply({
        content: `❌ Erreur lors du déploiement: ${error.message}`
      });
    }
  }
};
