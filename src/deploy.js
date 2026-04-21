require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

const commands = [
  // Commande Ticket
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gérer le système de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('configurer')
        .setDescription('Configurer le système de tickets')
        .addChannelOption(opt =>
          opt.setName('categorie')
            .setDescription('Catégorie où créer les tickets')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addChannelOption(opt =>
          opt.setName('salon')
            .setDescription('Salon pour le panel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub.setName('ajouter')
        .setDescription('Ajouter une catégorie de ticket')
        .addStringOption(opt =>
          opt.setName('id')
            .setDescription('ID unique (ex: support)')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('nom')
            .setDescription('Nom affiché')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('description')
            .setDescription('Description courte')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('emoji')
            .setDescription('Emoji')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('envoyer')
        .setDescription('Envoyer le panel de tickets')
    )
    .addSubcommand(sub =>
      sub.setName('liste')
        .setDescription('Lister les catégories')
    ),

  // Commande Exchanger
  new SlashCommandBuilder()
    .setName('exchanger')
    .setDescription('Gérer le système d\'échange')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('configurer')
        .setDescription('Configurer le salon d\'échange')
        .addChannelOption(opt =>
          opt.setName('salon')
            .setDescription('Salon pour le panel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand(sub =>
      sub.setName('ajouter')
        .setDescription('Ajouter une paire')
        .addStringOption(opt =>
          opt.setName('nom')
            .setDescription('Nom de la paire (ex: EUR/USD)')
            .setRequired(true)
        )
        .addNumberOption(opt =>
          opt.setName('taux')
            .setDescription('Taux de change')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('envoyer')
        .setDescription('Envoyer le panel d\'échange')
    ),

  // Commande Embed
  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Créer un embed personnalisé')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('salon')
        .setDescription('Salon cible')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption(opt =>
      opt.setName('titre')
        .setDescription('Titre')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('description')
        .setDescription('Description (utilise \\n pour saut de ligne)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('couleur')
        .setDescription('Couleur hex (ex: #1FFFBF)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('image')
        .setDescription('URL image')
        .setRequired(false)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('📝 Déploiement des commandes...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Commandes déployées !');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
})();
