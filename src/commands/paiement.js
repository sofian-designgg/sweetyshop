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
      let rawJson = interaction.options.getString('json', true).trim();
      
      if (rawJson.startsWith("'") && rawJson.endsWith("'")) rawJson = rawJson.slice(1, -1);
      if (rawJson.startsWith("`") && rawJson.endsWith("`")) rawJson = rawJson.slice(1, -1);

      let parsed;
      try {
        parsed = JSON.parse(rawJson);
      } catch (e) {
        await interaction.reply({ 
          content: `❌ **JSON invalide.**\nErreur : \`${e.message}\``, 
          ephemeral: true 
        });
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

      /** Discord coupe le message par espaces : le JSON avec espaces dans les textes devenait invalide. On relit le message brut après `+paiement set `. */
      const prefix = cfg.prefix || '+';
      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const hdr = new RegExp(`^${esc(prefix)}paiement\\s+set\\s+`, 'i');
      const full = message.content.trim();
      const mHdr = full.match(hdr);
      if (!mHdr) {
        await message.reply(
          'Usage : `+paiement set paypal {"title":"…","description":"…"}`\n' +
            '**Important :** tape d’abord la **clé** (`paypal`, `litecoin`, …), **sans** chevrons `< >`, puis un espace, puis tout le JSON (une ou plusieurs lignes).'
        );
        return;
      }
      let rest = full.slice(mHdr[0].length).trim();
      if (rest.startsWith('{') || rest.startsWith('<{')) {
        await message.reply(
          'Il manque la **clé** avant le JSON.\n' +
            'Exemple : `+paiement set paypal {"title":"Paiement par PayPal","description":"Texte avec espaces OK"}`\n' +
            'Les `< >` dans l’aide sont des repères, **ne les tape pas** autour du JSON.'
        );
        return;
      }
      const mParts = /^([A-Za-z0-9_-]+)\s+([\s\S]+)$/.exec(rest);
      if (!mParts) {
        await message.reply(
          'Format attendu : `+paiement set <clé> <json>` — la clé puis le JSON collé derrière.'
        );
        return;
      }
      let key = mParts[1].toLowerCase();
      let jsonStr = mParts[2].trim();
      if (jsonStr.startsWith('<')) jsonStr = jsonStr.slice(1).trim();
      if (jsonStr.endsWith('>')) jsonStr = jsonStr.slice(0, -1).trim();

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        await message.reply(
          'JSON invalide (guillemets, virgules, ou accolade manquante). Tu peux aussi utiliser `/paiement definir` avec le champ json.'
        );
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
