const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  ButtonBuilder,
  ButtonStyle,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require('discord.js');
const { getConfig, isTicketStaff } = require('../util/permissions');

module.exports = {
  name: 'avis',
  aliases: ['review', 'note'],
  description: 'Demander un avis client après livraison',
  slashData: new SlashCommandBuilder()
    .setName('avis')
    .setDescription('Demande d\'avis après commande')
    .addSubcommand((s) =>
      s
        .setName('demander')
        .setDescription('Envoie le message d\'avis au client (bouton privé)')
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
        content: 'Configure d\'abord `+config salon-avis` (salon où s\'affichent les avis).',
        ephemeral: true,
      });
      return;
    }
    const user = interaction.options.getUser('client', true);
    const order = interaction.options.getString('commande') || '';

    const raw = cfg.reviewRequestEmbed || {
      title: '⭐ Merci pour ta commande !',
      description:
        'Si tout s\'est bien passé, laisse un avis avec le bouton ci-dessous. Ça nous aide énormément.',
      color: 0xfeb900,
    };

    // Construction Components V2
    const container = new ContainerBuilder();
    
    // Couleur d'accentuation
    if (typeof raw.color === 'number') {
      container.setAccentColor(raw.color);
    }

    // Thumbnail optionnel
    if (raw.thumbnail) {
      try {
        const thumbnail = new ThumbnailBuilder({ media: { url: raw.thumbnail } });
        container.addThumbnail(thumbnail);
      } catch (e) {
        console.error('Erreur thumbnail avis:', e.message);
      }
    }

    // Titre
    if (raw.title) {
      container.addTextDisplay(new TextDisplayBuilder({ content: `## ${raw.title.slice(0, 256)}` }));
    }

    // Description
    let desc = raw.description || '';
    if (order) {
      desc += `\n\n**Commande:** ${order}`;
    }
    if (desc) {
      container.addTextDisplay(new TextDisplayBuilder({ content: desc.slice(0, 4000) }));
    }

    container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    // Section avec bouton intégré
    const section = new SectionBuilder();
    section.addTextDisplay(new TextDisplayBuilder({
      content: '**⭐ Votre avis compte !**\nCliquez sur le bouton pour laisser votre avis.',
    }));
    
    const btn = new ButtonBuilder()
      .setCustomId(`review:open:${interaction.guildId}:${user.id}`)
      .setLabel('Laisser un avis')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⭐');
    section.setAccessory(btn);
    
    container.addSection(section);

    // Footer optionnel
    if (raw.footer) {
      container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplay(new TextDisplayBuilder({
        content: `*${raw.footer.slice(0, 2048)}*`,
      }));
    }

    await interaction.reply({
      content: `${user}`,
      components: [container],
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
        'Si tout s\'est bien passé, laisse un avis avec le bouton ci-dessous. Ça nous aide énormément.',
      color: 0xfeb900,
    };

    // Construction Components V2
    const container = new ContainerBuilder();
    
    if (typeof raw.color === 'number') {
      container.setAccentColor(raw.color);
    }

    if (raw.thumbnail) {
      try {
        const thumbnail = new ThumbnailBuilder({ media: { url: raw.thumbnail } });
        container.addThumbnail(thumbnail);
      } catch (e) {
        console.error('Erreur thumbnail avis:', e.message);
      }
    }

    if (raw.title) {
      container.addTextDisplay(new TextDisplayBuilder({ content: `## ${raw.title.slice(0, 256)}` }));
    }

    let desc = raw.description || '';
    if (order) {
      desc += `\n\n**Commande:** ${order}`;
    }
    if (desc) {
      container.addTextDisplay(new TextDisplayBuilder({ content: desc.slice(0, 4000) }));
    }

    container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    const section = new SectionBuilder();
    section.addTextDisplay(new TextDisplayBuilder({
      content: '**⭐ Votre avis compte !**\nCliquez sur le bouton pour laisser votre avis.',
    }));
    
    const btn = new ButtonBuilder()
      .setCustomId(`review:open:${message.guild.id}:${user.id}`)
      .setLabel('Laisser un avis')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('⭐');
    section.setAccessory(btn);
    
    container.addSection(section);

    if (raw.footer) {
      container.addSeparator(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
      container.addTextDisplay(new TextDisplayBuilder({
        content: `*${raw.footer.slice(0, 2048)}*`,
      }));
    }

    await message.reply({
      content: `${user}`,
      components: [container],
    });
  },
};
