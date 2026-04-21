const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Créer un embed personnalisé')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const channel = interaction.options.getChannel('salon');
      const title = interaction.options.getString('titre');
      let description = interaction.options.getString('description');
      const colorHex = interaction.options.getString('couleur');
      const image = interaction.options.getString('image');

      // Convertir \n en vrais sauts de ligne
      description = description.replace(/\\n/g, '\n');

      // Créer l'embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

      // Couleur
      if (colorHex) {
        const color = parseInt(colorHex.replace('#', ''), 16);
        embed.setColor(isNaN(color) ? 0x1FFFBF : color);
      } else {
        embed.setColor(0x1FFFBF);
      }

      // Image
      if (image) {
        embed.setImage(image);
      }

      // Envoyer
      await channel.send({ embeds: [embed] });

      await interaction.reply({
        content: `✅ Embed envoyé dans ${channel}`,
        flags: MessageFlags.Ephemeral
      });

    } catch (error) {
      console.error('[Embed]', error);
      await interaction.reply({
        content: `❌ Erreur: ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
