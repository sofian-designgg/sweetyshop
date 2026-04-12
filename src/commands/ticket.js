const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const { getConfig, isConfigAdmin } = require('../util/permissions');
const { buildTicketPanel } = require('../util/ticketPanel');
const { parseHexColor } = require('../util/embeds');

async function assertAdmin(interaction, cfg) {
  const ok =
    interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild) ||
    (await isConfigAdmin(interaction.member, cfg));
  if (!ok) {
    await interaction.reply({
      content: 'Il faut **Gérer le serveur** ou un rôle admin config.',
      ephemeral: true,
    });
    return false;
  }
  return true;
}

async function sendOrUpdatePanel(guild, cfg) {
  const chId = cfg.ticketPanelChannelId;
  if (!chId) return { error: 'Salon panel non défini (`+config salon-panel`).' };
  const ch = guild.channels.cache.get(chId);
  if (!ch?.isTextBased()) {
    return { error: 'Salon panel invalide.' };
  }
  const payload = buildTicketPanel(cfg, guild.name);
  if (cfg.ticketPanelMessageId) {
    try {
      const msg = await ch.messages.fetch(cfg.ticketPanelMessageId);
      await msg.edit(payload);
      return { ok: true, updated: true, channel: ch };
    } catch {
      /* nouveau message */
    }
  }
  const msg = await ch.send(payload);
  cfg.ticketPanelMessageId = msg.id;
  await cfg.save();
  return { ok: true, updated: false, channel: ch };
}

module.exports = {
  name: 'ticket',
  description: 'Gestion des tickets',
  slashData: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Tickets — panel et boutons')
    .addSubcommand((s) =>
      s.setName('panel-envoyer').setDescription('Envoie ou met à jour le panel')
    )
    .addSubcommand((s) =>
      s
        .setName('bouton-ajouter')
        .setDescription('Ajouter une catégorie / bouton')
        .addStringOption((o) =>
          o.setName('id').setDescription('Identifiant unique (ex: nitro)').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('label').setDescription('Texte du bouton').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('emoji').setDescription('Emoji unicode ou :nom:').setRequired(false)
        )
        .addIntegerOption((o) =>
          o
            .setName('rangee')
            .setDescription('Rangée 0-4 (max 5 boutons par rangée)')
            .setMinValue(0)
            .setMaxValue(4)
            .setRequired(false)
        )
        .addStringOption((o) =>
          o
            .setName('texte')
            .setDescription('Texte affiché au-dessus (gras dans l’embed)')
            .setRequired(false)
        )
        .addStringOption((o) =>
          o
            .setName('indice')
            .setDescription('Petite ligne sous le texte')
            .setRequired(false)
        )
        .addStringOption((o) =>
          o
            .setName('style')
            .setDescription('Style du bouton')
            .addChoices(
              { name: 'Secondary', value: 'Secondary' },
              { name: 'Primary', value: 'Primary' },
              { name: 'Success', value: 'Success' },
              { name: 'Danger', value: 'Danger' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('bouton-supprimer')
        .setDescription('Supprimer une catégorie')
        .addStringOption((o) =>
          o.setName('id').setDescription('Identifiant').setRequired(true)
        )
    )
    .addSubcommand((s) =>
      s.setName('liste').setDescription('Lister les catégories ticket')
    ),
  async executeSlash(interaction) {
    const cfg = await getConfig(interaction.guildId);
    const sub = interaction.options.getSubcommand();

    if (sub === 'liste') {
      const cats = cfg.ticketCategories || [];
      const embed = new EmbedBuilder()
        .setTitle('Catégories ticket')
        .setColor(0x5865f2)
        .setDescription(
          cats.length
            ? cats.map((c) => `**${c.id}** — ${c.label} (rangée ${c.row})`).join('\n')
            : 'Aucune.'
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (!(await assertAdmin(interaction, cfg))) return;

    if (sub === 'panel-envoyer') {
      const r = await sendOrUpdatePanel(interaction.guild, cfg);
      if (r.error) {
        await interaction.reply({ content: r.error, ephemeral: true });
        return;
      }
      await interaction.reply({
        content: r.updated ? 'Panel mis à jour.' : 'Panel envoyé.',
        ephemeral: true,
      });
      return;
    }

    if (sub === 'bouton-ajouter') {
      const id = interaction.options.getString('id', true).toLowerCase().replace(/\s+/g, '-');
      const label = interaction.options.getString('label', true);
      const emoji = interaction.options.getString('emoji') || '';
      const row = interaction.options.getInteger('rangee') ?? 0;
      const prompt = interaction.options.getString('texte') || label;
      const hint = interaction.options.getString('indice') || '';
      const style = interaction.options.getString('style') || 'Secondary';
      const list = cfg.ticketCategories || [];
      if (list.find((c) => c.id === id)) {
        await interaction.reply({ content: 'Cet **id** existe déjà.', ephemeral: true });
        return;
      }
      list.push({ id, label, emoji, row, prompt, hint, style });
      cfg.ticketCategories = list;
      cfg.markModified('ticketCategories');
      await cfg.save();
      await interaction.reply({
        content: `Bouton **${id}** ajouté. Utilise \`/ticket panel-envoyer\`.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === 'bouton-supprimer') {
      const id = interaction.options.getString('id', true).toLowerCase();
      const list = (cfg.ticketCategories || []).filter((c) => c.id !== id);
      if (list.length === (cfg.ticketCategories || []).length) {
        await interaction.reply({ content: 'Id introuvable.', ephemeral: true });
        return;
      }
      cfg.ticketCategories = list;
      cfg.markModified('ticketCategories');
      await cfg.save();
      await interaction.reply({
        content: `Supprimé. Pense à \`/ticket panel-envoyer\`.`,
        ephemeral: true,
      });
    }
  },

  async executePrefix(message, args, { cfg }) {
    const admin =
      message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      (await isConfigAdmin(message.member, cfg));
    const sub = (args.shift() || '').toLowerCase();

    if (sub === 'envoyer' || sub === 'panel') {
      if (!admin) {
        await message.reply('Permission refusée.');
        return;
      }
      const r = await sendOrUpdatePanel(message.guild, cfg);
      if (r.error) {
        await message.reply(r.error);
        return;
      }
      await message.reply(r.updated ? 'Panel mis à jour.' : 'Panel envoyé.');
      return;
    }

    if (sub === 'liste') {
      const cats = cfg.ticketCategories || [];
      await message.reply(
        cats.length
          ? cats.map((c) => `**${c.id}** — ${c.label} (r${c.row})`).join('\n')
          : 'Aucune catégorie.'
      );
      return;
    }

    if (sub === 'bouton') {
      if (!admin) {
        await message.reply('Permission refusée.');
        return;
      }
      const action = (args.shift() || '').toLowerCase();
      if (action === 'add' || action === 'ajouter') {
        const line = args.join(' ');
        const parts = line.split('|').map((s) => s.trim());
        if (parts.length < 2) {
          await message.reply(
            'Format : `+ticket bouton add id|label|emoji|rangée|texte`\n(emoji, rangée, texte optionnels)'
          );
          return;
        }
        const [idRaw, label, emoji = '', rowRaw = '0', ...rest] = parts;
        const id = idRaw.toLowerCase().replace(/\s+/g, '-');
        const row = Math.min(4, Math.max(0, parseInt(rowRaw, 10) || 0));
        const prompt = rest[0] || label;
        const hint = rest[1] || '';
        const list = cfg.ticketCategories || [];
        if (list.find((c) => c.id === id)) {
          await message.reply('Cet id existe déjà.');
          return;
        }
        list.push({
          id,
          label,
          emoji,
          row,
          prompt,
          hint,
          style: 'Secondary',
        });
        cfg.ticketCategories = list;
        cfg.markModified('ticketCategories');
        await cfg.save();
        await message.reply(`Ajouté **${id}**. Envoie le panel : \`+ticket envoyer\`.`);
        return;
      }
      if (action === 'remove' || action === 'supprimer') {
        const id = (args.shift() || '').toLowerCase();
        if (!id) {
          await message.reply('Usage : `+ticket bouton remove <id>`');
          return;
        }
        const list = (cfg.ticketCategories || []).filter((c) => c.id !== id);
        cfg.ticketCategories = list;
        cfg.markModified('ticketCategories');
        await cfg.save();
        await message.reply(`Supprimé. \`+ticket envoyer\` pour rafraîchir.`);
        return;
      }
    }

    if (sub === 'welcome' && admin) {
      const text = args.join(' ');
      if (!text) {
        await message.reply('Usage : `+ticket welcome <description embed>`');
        return;
      }
      cfg.ticketWelcomeEmbed = cfg.ticketWelcomeEmbed || {};
      cfg.ticketWelcomeEmbed.description = text;
      cfg.markModified('ticketWelcomeEmbed');
      await cfg.save();
      await message.reply('Message d’accueil ticket mis à jour.');
      return;
    }

    if (sub === 'panel-titre' && admin) {
      const t = args.join(' ');
      cfg.ticketPanelEmbed = cfg.ticketPanelEmbed || {};
      cfg.ticketPanelEmbed.title = t;
      cfg.markModified('ticketPanelEmbed');
      await cfg.save();
      await message.reply('Titre du panel mis à jour.');
      return;
    }

    if (sub === 'panel-desc' && admin) {
      const t = args.join(' ');
      cfg.ticketPanelEmbed = cfg.ticketPanelEmbed || {};
      cfg.ticketPanelEmbed.description = t;
      cfg.markModified('ticketPanelEmbed');
      await cfg.save();
      await message.reply('Description du panel mise à jour.');
      return;
    }

    if (sub === 'panel-image' && admin) {
      const u = args[0];
      if (!u?.startsWith('http')) {
        await message.reply('Usage : `+ticket panel-image <url>`');
        return;
      }
      cfg.ticketPanelEmbed = cfg.ticketPanelEmbed || {};
      cfg.ticketPanelEmbed.image = u;
      cfg.markModified('ticketPanelEmbed');
      await cfg.save();
      await message.reply('Image du panel mise à jour.');
      return;
    }

    if (sub === 'panel-couleur' && admin) {
      const n = parseHexColor(args[0]);
      if (n == null) {
        await message.reply('Usage : `+ticket panel-couleur #5865F2`');
        return;
      }
      cfg.ticketPanelEmbed = cfg.ticketPanelEmbed || {};
      cfg.ticketPanelEmbed.color = n;
      cfg.markModified('ticketPanelEmbed');
      await cfg.save();
      await message.reply('Couleur du panel mise à jour.');
      return;
    }

    await message.reply(
      'Sous-commandes : `envoyer`, `liste`, `bouton add|remove`, `panel-titre`, `panel-desc`, `panel-image`, `panel-couleur`, `welcome`'
    );
  },
};
