const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exchanger')
    .setDescription('Gérer le système d\'échange')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, Config) {
    const subcommand = interaction.options.getSubcommand();
    const cfg = await Config.findOne({ guildId: interaction.guild.id }) || new Config({ guildId: interaction.guild.id });

    try {
      switch (subcommand) {
        case 'configurer':
          await handleConfigure(interaction, cfg);
          break;
        case 'ajouter':
          await handleAdd(interaction, cfg);
          break;
        case 'envoyer':
          await handleSend(interaction, cfg);
          break;
      }
    } catch (error) {
      console.error('[Exchanger]', error);
      await interaction.reply({
        content: `❌ Erreur: ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

async function handleConfigure(interaction, cfg) {
  const channel = interaction.options.getChannel('salon');

  if (!cfg.exchanger) cfg.exchanger = {};
  cfg.exchanger.channelId = channel.id;
  await cfg.save();

  await interaction.reply({
    content: `✅ Salon exchanger configuré: ${channel}`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleAdd(interaction, cfg) {
  const name = interaction.options.getString('nom');
  const rate = interaction.options.getNumber('taux');

  if (!cfg.exchanger) cfg.exchanger = { pairs: [] };
  if (!cfg.exchanger.pairs) cfg.exchanger.pairs = [];

  // Vérifier si existe déjà
  const existing = cfg.exchanger.pairs.find(p => p.name === name);
  if (existing) {
    existing.rate = rate;
    await cfg.save();
    return interaction.reply({
      content: `✅ Taux mis à jour: **${name}** = ${rate}`,
      flags: MessageFlags.Ephemeral
    });
  }

  cfg.exchanger.pairs.push({ name, rate });
  await cfg.save();

  await interaction.reply({
    content: `✅ Paire ajoutée: **${name}** = ${rate}`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleSend(interaction, cfg) {
  if (!cfg.exchanger?.channelId) {
    return interaction.reply({
      content: '❌ Configure d\'abord avec `/exchanger configurer`',
      flags: MessageFlags.Ephemeral
    });
  }

  if (!cfg.exchanger.pairs?.length) {
    return interaction.reply({
      content: '❌ Ajoute d\'abord des paires avec `/exchanger ajouter`',
      flags: MessageFlags.Ephemeral
    });
  }

  const channel = interaction.guild.channels.cache.get(cfg.exchanger.channelId);
  if (!channel) {
    return interaction.reply({
      content: '❌ Salon introuvable. Reconfigure.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Créer l'embed
  const embed = new EmbedBuilder()
    .setTitle('💱 Système d\'Échange')
    .setDescription('Sélectionne une paire pour voir le taux actuel.')
    .setColor(0x5865F2)
    .setTimestamp();

  // Ajouter les taux dans l'embed
  cfg.exchanger.pairs.forEach(pair => {
    embed.addFields({
      name: pair.name,
      value: `Taux: **${pair.rate}**`,
      inline: true
    });
  });

  // Créer le select menu
  const options = cfg.exchanger.pairs.map(pair =>
    new StringSelectMenuOptionBuilder()
      .setLabel(pair.name)
      .setValue(pair.name)
      .setDescription(`Taux: ${pair.rate}`)
      .setEmoji('💱')
  );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('exchanger_select')
    .setPlaceholder('Choisir une paire...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await channel.send({ embeds: [embed], components: [row] });

  await interaction.reply({
    content: `✅ Panel exchanger envoyé dans ${channel}`,
    flags: MessageFlags.Ephemeral
  });
}
