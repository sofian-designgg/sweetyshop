const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const { getConfig, isConfigAdmin } = require('../util/permissions');
const { parseHexColor } = require('../util/embeds');

async function canConfig(member, cfg) {
  return (
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    (await isConfigAdmin(member, cfg))
  );
}

module.exports = {
  name: 'config',
  aliases: ['set', 'reglages'],
  description: 'Configuration du bot (salons, rôles, préfixe)',
  slashData: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Voir ou modifier la configuration du serveur')
    .addSubcommand((s) => s.setName('afficher').setDescription('Résumé des réglages'))
    .addSubcommand((s) =>
      s
        .setName('salon-exchanger')
        .setDescription('Définir le salon de l’exchanger')
        .addChannelOption((o) =>
          o.setName('salon').setDescription('Le salon texte').setRequired(true)
        )
    ),
  async executeSlash(interaction) {
    const cfg = await getConfig(interaction.guildId);
    if (!(await canConfig(interaction.member, cfg))) {
      await interaction.reply({ content: 'Permission refusée.', ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'afficher') {
      const embed = new EmbedBuilder()
        .setTitle('Configuration SweetyShop')
        .setColor(0x57f287)
        .addFields(
          { name: 'Préfixe', value: cfg.prefix || '+', inline: true },
          {
            name: 'Catégorie tickets',
            value: cfg.ticketCategoryId || '—',
            inline: true,
          },
          {
            name: 'Salon panel',
            value: cfg.ticketPanelChannelId || '—',
            inline: true,
          },
          {
            name: 'Salon avis',
            value: cfg.reviewChannelId || '—',
            inline: true,
          },
          {
            name: 'Log tickets',
            value: cfg.ticketTranscriptChannelId || '—',
            inline: true,
          },
          {
            name: 'Salon exchanger',
            value: cfg.exchangerConfig?.channelId || '—',
            inline: true,
          },
          {
            name: 'Rôles staff ticket',
            value: (cfg.ticketStaffRoleIds || []).map((id) => `<@&${id}>`).join(' ') || '—',
            inline: false,
          }
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'salon-exchanger') {
      const ch = interaction.options.getChannel('salon', true);
      if (!ch.isTextBased()) {
        await interaction.reply({ content: 'Veuillez choisir un salon texte.', ephemeral: true });
        return;
      }
      if (!cfg.exchangerConfig) cfg.exchangerConfig = {};
      cfg.exchangerConfig.channelId = ch.id;
      cfg.markModified('exchangerConfig');
      await cfg.save();
      await interaction.reply({ content: `✅ Salon exchanger défini sur ${ch}`, ephemeral: true });
      return;
    }
  },

  async executePrefix(message, args, { cfg }) {
    if (!(await canConfig(message.member, cfg))) {
      await message.reply('Permission refusée.');
      return;
    }

    const sub = (args.shift() || 'aide').toLowerCase();

    if (sub === 'aide' || sub === 'help') {
      await message.reply(
        [
          '`+config prefix <symbole>`',
          '`+config ticket-categorie <id_catégorie_discord>`',
          '`+config salon-panel <#salon>`',
          '`+config salon-avis <#salon>`',
          '`+config salon-exchanger <#salon>`',
          '`+config salon-log-ticket <#salon>`',
          '`+config staff-role add|remove <@role>`',
          '`+config admin-role add|remove <@role>`',
          '`+config max-tickets <nombre>`',
          '`+config avis-json <json>` — embed message demande d’avis',
          '`/config afficher`',
        ].join('\n')
      );
      return;
    }

    if (sub === 'prefix') {
      const p = args[0];
      if (!p || p.length > 5) {
        await message.reply('Usage : `+config prefix <symbole>`');
        return;
      }
      cfg.prefix = p;
      await cfg.save();
      await message.reply(`Préfixe : **${p}**`);
      return;
    }

    if (sub === 'ticket-categorie' || sub === 'ticket-category') {
      const id = args[0];
      if (!id?.match(/^\d+$/)) {
        await message.reply('Usage : `+config ticket-categorie <id>` (clic droit catégorie → ID)');
        return;
      }
      cfg.ticketCategoryId = id;
      await cfg.save();
      await message.reply('Catégorie parent des tickets enregistrée.');
      return;
    }

    if (sub === 'salon-panel') {
      const ch = message.mentions.channels.first();
      if (!ch?.isTextBased()) {
        await message.reply('Mentionne un **salon texte** : `+config salon-panel #salon`');
        return;
      }
      cfg.ticketPanelChannelId = ch.id;
      await cfg.save();
      await message.reply(`Panel ticket → ${ch}`);
      return;
    }

    if (sub === 'salon-avis') {
      const ch = message.mentions.channels.first();
      if (!ch?.isTextBased()) {
        await message.reply('Mentionne un salon texte.');
        return;
      }
      cfg.reviewChannelId = ch.id;
      await cfg.save();
      await message.reply(`Salon des avis → ${ch}`);
      return;
    }

    if (sub === 'salon-log-ticket' || sub === 'log-ticket') {
      const ch = message.mentions.channels.first();
      if (!ch?.isTextBased()) {
        await message.reply('Mentionne un salon texte.');
        return;
      }
      cfg.ticketTranscriptChannelId = ch.id;
      await cfg.save();
      await message.reply(`Log fermeture tickets → ${ch}`);
      return;
    }

    if (sub === 'salon-exchanger') {
      const ch = message.mentions.channels.first();
      if (!ch?.isTextBased()) {
        await message.reply('Mentionne un salon texte.');
        return;
      }
      if (!cfg.exchangerConfig) cfg.exchangerConfig = {};
      cfg.exchangerConfig.channelId = ch.id;
      cfg.markModified('exchangerConfig');
      await cfg.save();
      await message.reply(`Salon exchanger → ${ch}`);
      return;
    }

    if (sub === 'staff-role') {
      const act = (args.shift() || '').toLowerCase();
      const role = message.mentions.roles.first();
      if (!role || !['add', 'remove', 'ajouter', 'retirer'].includes(act)) {
        await message.reply('Usage : `+config staff-role add|remove @role`');
        return;
      }
      const list = new Set(cfg.ticketStaffRoleIds || []);
      if (act === 'add' || act === 'ajouter') list.add(role.id);
      else list.delete(role.id);
      cfg.ticketStaffRoleIds = [...list];
      await cfg.save();
      await message.reply('OK.');
      return;
    }

    if (sub === 'admin-role') {
      const act = (args.shift() || '').toLowerCase();
      const role = message.mentions.roles.first();
      if (!role || !['add', 'remove', 'ajouter', 'retirer'].includes(act)) {
        await message.reply('Usage : `+config admin-role add|remove @role`');
        return;
      }
      const list = new Set(cfg.modAdminRoleIds || []);
      if (act === 'add' || act === 'ajouter') list.add(role.id);
      else list.delete(role.id);
      cfg.modAdminRoleIds = [...list];
      await cfg.save();
      await message.reply('OK.');
      return;
    }

    if (sub === 'max-tickets') {
      const n = parseInt(args[0], 10);
      if (Number.isNaN(n) || n < 1 || n > 10) {
        await message.reply('Usage : `+config max-tickets <1-10>`');
        return;
      }
      cfg.ticketMaxPerUser = n;
      await cfg.save();
      await message.reply(`Max tickets / membre : **${n}**`);
      return;
    }

    if (sub === 'avis-json') {
      const raw = args.join(' ').trim();
      if (!raw) {
        await message.reply('Usage : `+config avis-json {"title":"…","description":"…"}`');
        return;
      }
      try {
        const j = JSON.parse(raw);
        if (typeof j.color === 'string' && j.color.startsWith('#')) {
          const c = parseHexColor(j.color);
          if (c != null) j.color = c;
        }
        cfg.reviewRequestEmbed = j;
        cfg.markModified('reviewRequestEmbed');
        await cfg.save();
        await message.reply('Embed demande d’avis mis à jour.');
      } catch {
        await message.reply('JSON invalide.');
      }
      return;
    }

    await message.reply('Sous-commande inconnue. `+config aide`');
  },
};
