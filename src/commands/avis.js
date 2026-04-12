const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getConfig, isTicketStaff } = require('../util/permissions');
const { embedFromConfig } = require('../util/embeds');

module.exports = {
  name: 'avis',
  aliases: ['review', 'note'],
  description: 'Demander un avis client après livraison',
  slashData: new SlashCommandBuilder()
    .setName('avis')
    .setDescription('Demande d’avis après commande')
    .addSubcommand((s) =>
      s
        .setName('demander')
        .setDescription('Envoie le message d’avis au client (bouton privé)')
        .addUserOption((o) =>
          o.setName('client').setDescription('Client').setRequired(true)
        )
        .addStringOption((o) =>
          o.setName('commande').setDescription('Référence commande').setRequired(false)
        )
    ),
  async executeSlash(interaction) {
    const cfg = await getConfig(interaction.guildId);
    const staff =
      interaction.memberPermissions.has(PermissionFlagsBits.ModerateMembers) ||
      (await isTicketStaff(interaction.member, cfg));
    if (!staff) {
      await interaction.reply({
        content: 'Réservé au **staff** / **modération**.',
        ephemeral: true,
      });
      return;
    }
    if (!cfg.reviewChannelId) {
      await interaction.reply({
        content: 'Configure d’abord `+config salon-avis` (salon où s’affichent les avis).',
        ephemeral: true,
      });
      return;
    }
    const user = interaction.options.getUser('client', true);
    const order = interaction.options.getString('commande') || '';

    const raw = cfg.reviewRequestEmbed || {
      title: '⭐ Merci pour ta commande !',
      description:
        'Si tout s’est bien passé, laisse un avis avec le bouton ci-dessous. Ça nous aide énormément.',
      color: 0xfeb900,
    };
    const embed = embedFromConfig(raw);
    if (order) {
      embed.addFields({ name: 'Commande', value: order, inline: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`review:open:${interaction.guildId}:${user.id}`)
        .setLabel('Laisser un avis')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⭐')
    );

    await interaction.reply({
      content: `${user}`,
      embeds: [embed],
      components: [row],
    });
  },

  async executePrefix(message, args, { cfg }) {
    const staff =
      message.member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
      (await isTicketStaff(message.member, cfg));
    if (!staff) {
      await message.reply('Réservé au staff.');
      return;
    }
    if (!cfg.reviewChannelId) {
      await message.reply('Configure `+config salon-avis`.');
      return;
    }
    const user = message.mentions.users?.first();
    if (!user) {
      await message.reply('Usage : `+avis @client [référence commande]`');
      return;
    }
    const order = args.slice(1).join(' ').trim();

    const raw = cfg.reviewRequestEmbed || {
      title: '⭐ Merci pour ta commande !',
      description:
        'Si tout s’est bien passé, laisse un avis avec le bouton ci-dessous. Ça nous aide énormément.',
      color: 0xfeb900,
    };
    const embed = embedFromConfig(raw);
    if (order) embed.addFields({ name: 'Commande', value: order, inline: true });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`review:open:${message.guild.id}:${user.id}`)
        .setLabel('Laisser un avis')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⭐')
    );

    await message.reply({
      content: `${user}`,
      embeds: [embed],
      components: [row],
    });
  },
};
