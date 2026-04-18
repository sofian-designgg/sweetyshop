const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { getConfig, isConfigAdmin } = require('../util/permissions');
const { embedFromConfig, parseHexColor } = require('../util/embeds');

module.exports = {
  name: 'exchanger',
  description: 'Gérer le système d’exchanger',
  slashData: new SlashCommandBuilder()
    .setName('exchanger')
    .setDescription('Configuration de l’exchanger')
    .addSubcommand((s) =>
      s
        .setName('taux')
        .setDescription('Définir un taux de change (ex: paypal-ltc 0.95)')
        .addStringOption((o) =>
          o.setName('paire').setDescription('Ex: paypal-ltc').setRequired(true)
        )
        .addNumberOption((o) =>
          o.setName('taux').setDescription('Taux (ex: 0.95 pour 5% de frais)').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('emoji').setDescription('Emoji pour le menu (ex: 💳)').setRequired(false)
        )
        .addStringOption((o) =>
          o.setName('description').setDescription('Description courte (ex: Frais 7%)').setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('supprimer-taux')
        .setDescription('Supprimer un taux de change')
        .addStringOption((o) =>
          o.setName('paire').setDescription('Ex: paypal-ltc').setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s.setName('panel-envoyer').setDescription('Envoyer le panel d’exchanger')
    )
    .addSubcommand((s) =>
      s
        .setName('config-embed')
        .setDescription('Configurer l’embed du panel via JSON')
        .addStringOption((o) => o.setName('json').setDescription('JSON embed').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async executeSlash(interaction) {
    const cfg = await getConfig(interaction.guildId);
    const sub = interaction.options.getSubcommand();

    const admin =
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      (await isConfigAdmin(interaction.member, cfg));
    if (!admin) {
      await interaction.reply({ content: 'Permission refusée.', ephemeral: true });
      return;
    }

    if (sub === 'taux') {
      const paire = interaction.options.getString('paire', true).toLowerCase();
      const taux = interaction.options.getNumber('taux', true);
      const emoji = interaction.options.getString('emoji') || null;
      const desc = interaction.options.getString('description') || `Taux: ${taux}`;

      if (!cfg.exchangerConfig) cfg.exchangerConfig = { rates: {} };
      if (!cfg.exchangerConfig.rates) cfg.exchangerConfig.rates = {};
      
      cfg.exchangerConfig.rates[paire] = {
        rate: taux,
        emoji: emoji,
        description: desc
      };
      
      cfg.markModified('exchangerConfig');
      await cfg.save();
      await interaction.reply({
        content: `Taux pour **${paire}** défini à **${taux}**.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === 'supprimer-taux') {
      const paire = interaction.options.getString('paire', true).toLowerCase();
      if (!cfg.exchangerConfig?.rates?.[paire]) {
        await interaction.reply({ content: 'Paire introuvable.', ephemeral: true });
        return;
      }
      delete cfg.exchangerConfig.rates[paire];
      cfg.markModified('exchangerConfig');
      await cfg.save();
      await interaction.reply({
        content: `Paire **${paire}** supprimée.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === 'config-embed') {
      let rawJson = interaction.options.getString('json', true).trim();
      if (rawJson.startsWith("'") && rawJson.endsWith("'")) rawJson = rawJson.slice(1, -1);
      if (rawJson.startsWith("`") && rawJson.endsWith("`")) rawJson = rawJson.slice(1, -1);

      try {
        const parsed = JSON.parse(rawJson);
        if (!cfg.exchangerConfig) cfg.exchangerConfig = {};
        cfg.exchangerConfig.embed = parsed;
        cfg.markModified('exchangerConfig');
        await cfg.save();
        await interaction.reply({
          content: '✅ Embed exchanger mis à jour. Utilisez `/exchanger panel-envoyer` pour voir le résultat.',
          ephemeral: true,
        });
      } catch (e) {
        await interaction.reply({ 
          content: `❌ **JSON invalide.**\nErreur : \`${e.message}\``, 
          ephemeral: true 
        });
      }
      return;
    }

    if (sub === 'panel-envoyer') {
      const exchangerCfg = cfg.exchangerConfig || {};
      const channelId = exchangerCfg.channelId || interaction.channelId;
      const channel = interaction.guild.channels.cache.get(channelId) || interaction.channel;

      if (!channel?.isTextBased()) {
        await interaction.reply({
          content: 'Impossible d’envoyer le panel dans ce salon (non-texte).',
          ephemeral: true,
        });
        return;
      }

      const embedData = exchangerCfg.embed || {
        title: 'Exchanger',
        description: 'Choisissez votre paire d’échange ci-dessous.',
        color: 0x00ff00,
      };

      const embed = embedFromConfig(embedData);
      const rates = exchangerCfg.rates || {};
      const pairs = Object.keys(rates);

      if (pairs.length === 0) {
        await interaction.reply({
          content: 'Aucun taux de change configuré. Utilisez `/exchanger taux`.',
          ephemeral: true,
        });
        return;
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId('exchange:select')
        .setPlaceholder('Sélectionnez une option d’échange...')
        .addOptions(
          pairs.map((pair) => {
            const data = rates[pair];
            const option = {
              label: pair.toUpperCase(),
              description: typeof data === 'object' ? data.description : `Taux: ${data}`,
              value: pair,
            };

            const rawEmoji = typeof data === 'object' ? data.emoji : null;
            if (rawEmoji) {
              const customEmojiMatch = rawEmoji.match(/<?(?:a:)?\w+:(\d+)>?/);
              if (customEmojiMatch) option.emoji = customEmojiMatch[1];
              else option.emoji = rawEmoji;
            }
            return option;
          })
        );

      const row = new ActionRowBuilder().addComponents(menu);

      try {
        const msg = await channel.send({ embeds: [embed], components: [row] });
        if (!cfg.exchangerConfig) cfg.exchangerConfig = {};
        cfg.exchangerConfig.channelId = channel.id;
        cfg.exchangerConfig.messageId = msg.id;
        cfg.markModified('exchangerConfig');
        await cfg.save();

        await interaction.reply({
          content: `✅ Panel exchanger envoyé dans ${channel}.`,
          ephemeral: true,
        });
      } catch (e) {
        console.error('Error sending exchanger panel:', e);
        await interaction.reply({
          content: `❌ Impossible d’envoyer le panel.\nErreur : \`${e.message}\``,
          ephemeral: true,
        });
      }
    }
  },
};
