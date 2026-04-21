const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getConfig } = require('../utils/permissions');
const { buildExchangerPanel } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('exchanger')
    .setDescription('Gestion de l\'exchanger de devises')
    .addSubcommand(sub =>
      sub.setName('panel-envoyer')
        .setDescription('Envoie le panel d\'exchanger')
    )
    .addSubcommand(sub =>
      sub.setName('paire-ajouter')
        .setDescription('Ajoute une paire de change')
        .addStringOption(opt => opt.setName('nom').setDescription('Nom de la paire (ex: usd-eur)').setRequired(true))
        .addNumberOption(opt => opt.setName('taux').setDescription('Taux de change').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji de la paire'))
        .addStringOption(opt => opt.setName('description').setDescription('Description de la paire'))
    )
    .addSubcommand(sub =>
      sub.setName('paire-supprimer')
        .setDescription('Supprime une paire')
        .addStringOption(opt => opt.setName('nom').setDescription('Nom de la paire').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('paire-modifier')
        .setDescription('Modifie le taux d\'une paire')
        .addStringOption(opt => opt.setName('nom').setDescription('Nom de la paire').setRequired(true))
        .addNumberOption(opt => opt.setName('taux').setDescription('Nouveau taux').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('Liste toutes les paires')
    )
    .addSubcommand(sub =>
      sub.setName('activer')
        .setDescription('Active l\'exchanger')
    )
    .addSubcommand(sub =>
      sub.setName('desactiver')
        .setDescription('Désactive l\'exchanger')
    )
    .addSubcommand(sub =>
      sub.setName('configurer')
        .setDescription('Configurer le panel')
        .addStringOption(opt => opt.setName('titre').setDescription('Titre du panel'))
        .addStringOption(opt => opt.setName('description').setDescription('Description du panel'))
        .addIntegerOption(opt => opt.setName('couleur').setDescription('Couleur (hex)'))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const cfg = await getConfig(interaction.guild.id);

    // Vérification admin
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ Tu dois avoir la permission **Gérer le serveur**.',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      switch (subcommand) {
        case 'panel-envoyer':
          await handlePanelSend(interaction, cfg);
          break;
        case 'paire-ajouter':
          await handleAddPair(interaction, cfg);
          break;
        case 'paire-supprimer':
          await handleRemovePair(interaction, cfg);
          break;
        case 'paire-modifier':
          await handleUpdatePair(interaction, cfg);
          break;
        case 'liste':
          await handleList(interaction, cfg);
          break;
        case 'activer':
          await handleEnable(interaction, cfg);
          break;
        case 'desactiver':
          await handleDisable(interaction, cfg);
          break;
        case 'configurer':
          await handleConfigure(interaction, cfg);
          break;
      }
    } catch (error) {
      console.error('[Exchanger]', error);
      await interaction.reply({
        content: `❌ Erreur: ${error.message}`,
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
};

// Handler: Envoyer le panel (classique)
async function handlePanelSend(interaction, cfg) {
  if (!cfg.exchangerConfig?.enabled) {
    return interaction.reply({
      content: '❌ L\'exchanger n\'est pas activé. Utilise `/exchanger activer`.',
      flags: MessageFlags.Ephemeral
    });
  }

  const rates = cfg.exchangerConfig?.rates || {};
  if (Object.keys(rates).length === 0) {
    return interaction.reply({
      content: '❌ Aucune paire configurée. Ajoute des paires avec `/exchanger paire-ajouter`.',
      flags: MessageFlags.Ephemeral
    });
  }

  const channel = interaction.channel;
  const payload = buildExchangerPanel(cfg);
  
  await channel.send(payload);
  
  await interaction.reply({
    content: '✅ Panel d\'exchanger envoyé.',
    flags: MessageFlags.Ephemeral
  });
}

// Handler: Ajouter une paire
async function handleAddPair(interaction, cfg) {
  const name = interaction.options.getString('nom').toLowerCase().trim();
  const rate = interaction.options.getNumber('taux');
  const emoji = interaction.options.getString('emoji') || '💱';
  const description = interaction.options.getString('description') || '';

  if (!cfg.exchangerConfig) {
    cfg.exchangerConfig = { enabled: false, rates: {}, embed: {} };
  }
  if (!cfg.exchangerConfig.rates) {
    cfg.exchangerConfig.rates = {};
  }

  // Vérifier si existe déjà
  if (cfg.exchangerConfig.rates[name]) {
    return interaction.reply({
      content: `❌ La paire \`${name}\` existe déjà. Utilise "/exchanger paire-modifier" pour changer le taux.`,
      flags: MessageFlags.Ephemeral
    });
  }

  cfg.exchangerConfig.rates[name] = {
    rate,
    emoji,
    description
  };

  await cfg.save();

  await interaction.reply({
    content: `✅ Paire \`${name}\` ajoutée avec un taux de ${rate}.`,
    flags: MessageFlags.Ephemeral
  });
}

// Handler: Supprimer une paire
async function handleRemovePair(interaction, cfg) {
  const name = interaction.options.getString('nom').toLowerCase().trim();

  if (!cfg.exchangerConfig?.rates?.[name]) {
    return interaction.reply({
      content: `❌ La paire \`${name}\` n\'existe pas.`,
      flags: MessageFlags.Ephemeral
    });
  }

  delete cfg.exchangerConfig.rates[name];
  await cfg.save();

  await interaction.reply({
    content: `✅ Paire \`${name}\` supprimée.`,
    flags: MessageFlags.Ephemeral
  });
}

// Handler: Modifier une paire
async function handleUpdatePair(interaction, cfg) {
  const name = interaction.options.getString('nom').toLowerCase().trim();
  const rate = interaction.options.getNumber('taux');

  if (!cfg.exchangerConfig?.rates?.[name]) {
    return interaction.reply({
      content: `❌ La paire \`${name}\` n\'existe pas.`,
      flags: MessageFlags.Ephemeral
    });
  }

  const current = cfg.exchangerConfig.rates[name];
  if (typeof current === 'object') {
    current.rate = rate;
  } else {
    cfg.exchangerConfig.rates[name] = { rate, emoji: '💱' };
  }

  await cfg.save();

  await interaction.reply({
    content: `✅ Paire \`${name}\` mise à jour avec un taux de ${rate}.`,
    flags: MessageFlags.Ephemeral
  });
}

// Handler: Liste des paires
async function handleList(interaction, cfg) {
  const rates = cfg.exchangerConfig?.rates || {};
  const pairs = Object.entries(rates);

  if (pairs.length === 0) {
    return interaction.reply({
      content: '📭 Aucune paire configurée.',
      flags: MessageFlags.Ephemeral
    });
  }

  const list = pairs.map(([name, data]) => {
    const rate = typeof data === 'number' ? data : data?.rate || 1;
    const emoji = typeof data === 'object' ? data?.emoji : '💱';
    return `${emoji} **${name.toUpperCase()}** → ${rate}`;
  }).join('\n');

  await interaction.reply({
    content: `💱 **Paires disponibles (${pairs.length}):**\n${list}`,
    flags: MessageFlags.Ephemeral
  });
}

// Handler: Activer
async function handleEnable(interaction, cfg) {
  if (!cfg.exchangerConfig) {
    cfg.exchangerConfig = { enabled: true, rates: {}, embed: {} };
  }
  cfg.exchangerConfig.enabled = true;
  await cfg.save();

  await interaction.reply({
    content: '✅ Exchanger activé.',
    flags: MessageFlags.Ephemeral
  });
}

// Handler: Désactiver
async function handleDisable(interaction, cfg) {
  if (cfg.exchangerConfig) {
    cfg.exchangerConfig.enabled = false;
    await cfg.save();
  }

  await interaction.reply({
    content: '✅ Exchanger désactivé.',
    flags: MessageFlags.Ephemeral
  });
}

// Handler: Configurer
async function handleConfigure(interaction, cfg) {
  if (!cfg.exchangerConfig) {
    cfg.exchangerConfig = { enabled: false, rates: {}, embed: {} };
  }
  if (!cfg.exchangerConfig.embed) {
    cfg.exchangerConfig.embed = {};
  }

  const titre = interaction.options.getString('titre');
  const description = interaction.options.getString('description');
  const couleur = interaction.options.getInteger('couleur');

  if (titre) cfg.exchangerConfig.embed.title = titre;
  if (description) cfg.exchangerConfig.embed.description = description;
  if (couleur !== null) cfg.exchangerConfig.embed.color = couleur;

  await cfg.save();

  await interaction.reply({
    content: '✅ Configuration de l\'exchanger mise à jour.',
    flags: MessageFlags.Ephemeral
  });
}
