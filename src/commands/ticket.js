const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gérer le système de tickets')
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
        case 'liste':
          await handleList(interaction, cfg);
          break;
      }
    } catch (error) {
      console.error('[Ticket]', error);
      await interaction.reply({
        content: `❌ Erreur: ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

async function handleConfigure(interaction, cfg) {
  const category = interaction.options.getChannel('categorie');
  const channel = interaction.options.getChannel('salon');

  cfg.ticketCategoryId = category.id;
  cfg.ticketChannelId = channel.id;
  await cfg.save();

  await interaction.reply({
    content: `✅ Configuration sauvegardée:\n• Catégorie: ${category.name}\n• Salon: ${channel}`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleAdd(interaction, cfg) {
  const id = interaction.options.getString('id').toLowerCase().trim();
  const name = interaction.options.getString('nom');
  const description = interaction.options.getString('description') || 'Ouvrir un ticket';
  const emoji = interaction.options.getString('emoji') || '🎫';

  if (!cfg.ticketCategories) cfg.ticketCategories = [];

  // Vérifier si l'ID existe déjà
  if (cfg.ticketCategories.find(c => c.id === id)) {
    return interaction.reply({
      content: `❌ L'ID \`${id}\` existe déjà.`,
      flags: MessageFlags.Ephemeral
    });
  }

  cfg.ticketCategories.push({ id, label: name, description, emoji });
  await cfg.save();

  await interaction.reply({
    content: `✅ Catégorie ajoutée: **${name}** (\`${id}\`)`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleSend(interaction, cfg) {
  if (!cfg.ticketChannelId) {
    return interaction.reply({
      content: '❌ Configure d\'abord avec `/ticket configurer`',
      flags: MessageFlags.Ephemeral
    });
  }

  if (!cfg.ticketCategories?.length) {
    return interaction.reply({
      content: '❌ Ajoute d\'abord des catégories avec `/ticket ajouter`',
      flags: MessageFlags.Ephemeral
    });
  }

  const channel = interaction.guild.channels.cache.get(cfg.ticketChannelId);
  if (!channel) {
    return interaction.reply({
      content: '❌ Salon introuvable. Reconfigure.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Créer l'embed
  const embed = new EmbedBuilder()
    .setTitle('🎫 Système de Tickets')
    .setDescription('Sélectionne une catégorie ci-dessous pour ouvrir un ticket.')
    .setColor(0x1FFFBF)
    .setFooter({ text: 'Notre équipe te répondra rapidement !' })
    .setTimestamp();

  // Créer le select menu
  const options = cfg.ticketCategories.map(cat =>
    new StringSelectMenuOptionBuilder()
      .setLabel(cat.label)
      .setValue(cat.id)
      .setDescription(cat.description?.substring(0, 50))
      .setEmoji(cat.emoji || '🎫')
  );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_create')
    .setPlaceholder('Choisir une catégorie...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Envoyer ou mettre à jour
  let message;
  if (cfg.ticketMessageId) {
    try {
      const oldMsg = await channel.messages.fetch(cfg.ticketMessageId);
      await oldMsg.edit({ embeds: [embed], components: [row] });
      message = oldMsg;
    } catch {
      message = await channel.send({ embeds: [embed], components: [row] });
    }
  } else {
    message = await channel.send({ embeds: [embed], components: [row] });
  }

  cfg.ticketMessageId = message.id;
  await cfg.save();

  await interaction.reply({
    content: `✅ Panel envoyé dans ${channel}`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleList(interaction, cfg) {
  const cats = cfg.ticketCategories || [];
  if (cats.length === 0) {
    return interaction.reply({
      content: '📭 Aucune catégorie. Ajoute-en avec `/ticket ajouter`',
      flags: MessageFlags.Ephemeral
    });
  }

  const list = cats.map((c, i) => `${i + 1}. ${c.emoji || '🎫'} ${c.label} (\`${c.id}\`)`).join('\n');

  await interaction.reply({
    content: `📋 **Catégories (${cats.length}):**\n${list}`,
    flags: MessageFlags.Ephemeral
  });
}
