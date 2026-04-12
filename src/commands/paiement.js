const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, isConfigAdmin } = require('../util/permissions');
const { embedFromConfig, parseHexColor } = require('../util/embeds');

module.exports = {
  name: 'paiement',
  aliases: ['pay', 'payment'],
  description: 'Afficher ou configurer les embeds de paiement',
  slashData: new SlashCommandBuilder()
    .setName('paiement')
    .setDescription('Embeds PayPal / crypto')
    .addSubcommand((s) =>
      s
        .setName('afficher')
        .setDescription('Afficher un embed enregistré')
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Clé (paypal, litecoin, …)')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('definir')
        .setDescription('Définir un embed via JSON (admin)')
        .addStringOption((o) =>
          o.setName('type').setDescription('Clé unique').setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('json')
            .setDescription(
              'JSON embed: title, description, color (#hex ou nombre), image, footer, fields[]'
            )
            .setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('champ')
        .setDescription('Modifier un champ d’un embed')
        .addStringOption((o) => o.setName('type').setDescription('Clé').setRequired(true))
        .addIntegerOption((o) =>
          o.setName('index').setDescription('Index champ (0-based)').setRequired(true).setMinValue(0)
        )
        .addStringOption((o) => o.setName('nom').setDescription('Nom du champ').setRequired(true))
        .addStringOption((o) => o.setName('valeur').setDescription('Valeur').setRequired(true))
        .addBooleanOption((o) =>
          o.setName('inline').setDescription('En ligne').setRequired(false)
        )
    ),
  async autocomplete(interaction) {
    const cfg = await getConfig(interaction.guildId);
    const keys = Object.keys(cfg.paymentEmbeds || {});
    const focused = interaction.options.getFocused();
    const q = focused.value.toLowerCase();
    const filtered = keys.filter((k) => k.includes(q)).slice(0, 25);
    await interaction.respond(filtered.map((k) => ({ name: k, value: k })));
  },
  async executeSlash(interaction) {
    const cfg = await getConfig(interaction.guildId);
    const sub = interaction.options.getSubcommand();

    if (sub === 'afficher') {
      const key = interaction.options.getString('type', true).toLowerCase();
      const raw = cfg.paymentEmbeds?.[key];
      if (!raw) {
        await interaction.reply({
          content: `Clé **${key}** inconnue. Utilise \`/paiement definir\`.`,
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({ embeds: [embedFromConfig(raw)], ephemeral: true });
      return;
    }

    const admin =
      interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
      (await isConfigAdmin(interaction.member, cfg));
    if (!admin) {
      await interaction.reply({ content: 'Permission refusée.', ephemeral: true });
      return;
    }

    if (sub === 'definir') {
      const key = interaction.options.getString('type', true).toLowerCase();
      const rawJson = interaction.options.getString('json', true);
      let parsed;
      try {
        parsed = JSON.parse(rawJson);
      } catch {
        await interaction.reply({ content: 'JSON invalide.', ephemeral: true });
        return;
      }
      if (typeof parsed.color === 'string' && parsed.color.startsWith('#')) {
        const c = parseHexColor(parsed.color);
        if (c != null) parsed.color = c;
      }
      cfg.paymentEmbeds = cfg.paymentEmbeds || {};
      cfg.paymentEmbeds[key] = parsed;
      cfg.markModified('paymentEmbeds');
      await cfg.save();
      await interaction.reply({
        content: `Embed **${key}** enregistré.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === 'champ') {
      const key = interaction.options.getString('type', true).toLowerCase();
      const idx = interaction.options.getInteger('index', true);
      const name = interaction.options.getString('nom', true);
      const value = interaction.options.getString('valeur', true);
      const inline = interaction.options.getBoolean('inline') ?? false;
      cfg.paymentEmbeds = cfg.paymentEmbeds || {};
      const emb = cfg.paymentEmbeds[key] || { fields: [] };
      emb.fields = emb.fields || [];
      while (emb.fields.length <= idx) {
        emb.fields.push({ name: '\u200b', value: '\u200b', inline: false });
      }
      emb.fields[idx] = { name, value, inline };
      cfg.paymentEmbeds[key] = emb;
      cfg.markModified('paymentEmbeds');
      await cfg.save();
      await interaction.reply({ content: `Champ **${idx}** mis à jour pour **${key}**.`, ephemeral: true });
    }
  },

  async executePrefix(message, args, { cfg }) {
    const sub = (args.shift() || '').toLowerCase();
    if (sub === 'voir' || sub === 'show') {
      const key = (args.shift() || '').toLowerCase();
      if (!key) {
        await message.reply(
          `Clés : ${Object.keys(cfg.paymentEmbeds || {}).join(', ') || 'aucune'}`
        );
        return;
      }
      const raw = cfg.paymentEmbeds?.[key];
      if (!raw) {
        await message.reply('Clé inconnue.');
        return;
      }
      await message.reply({ embeds: [embedFromConfig(raw)] });
      return;
    }
    if (sub === 'set' || sub === 'definir') {
      const admin =
        message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        (await isConfigAdmin(message.member, cfg));
      if (!admin) {
        await message.reply('Permission refusée.');
        return;
      }
      const key = (args.shift() || '').toLowerCase();
      const json = args.join(' ').trim();
      if (!key || !json) {
        await message.reply('Usage : `+paiement set <clé> <json>`');
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(json);
      } catch {
        await message.reply('JSON invalide.');
        return;
      }
      if (typeof parsed.color === 'string' && parsed.color.startsWith('#')) {
        const c = parseHexColor(parsed.color);
        if (c != null) parsed.color = c;
      }
      cfg.paymentEmbeds = cfg.paymentEmbeds || {};
      cfg.paymentEmbeds[key] = parsed;
      cfg.markModified('paymentEmbeds');
      await cfg.save();
      await message.reply(`OK — **${key}**`);
      return;
    }
    await message.reply('Usage : `+paiement show <clé>` ou `+paiement set <clé> <json>`');
  },
};
