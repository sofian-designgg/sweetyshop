const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const { getConfig, isConfigAdmin } = require('../util/permissions');
const {
  createTicketChannel,
  countOpenTickets,
  closeTicket,
  createExchangeTicket,
} = require('../services/ticketService');
const Review = require('../models/Review');
const { embedFromConfig } = require('../util/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (interaction.isAutocomplete()) {
        const cmd = client.slashCommands.get(interaction.commandName);
        if (cmd?.autocomplete) await cmd.autocomplete(interaction);
        return;
      }

      if (interaction.isChatInputCommand()) {
        const cmd = client.slashCommands.get(interaction.commandName);
        if (!cmd?.executeSlash) return;
        await cmd.executeSlash(interaction, { client });
        return;
      }

      if (interaction.isButton()) {
        const id = interaction.customId;
        if (id.startsWith('ticket:open:')) {
          const key = id.slice('ticket:open:'.length);
          
          // On demande le produit via un Modal si c'est un ticket d'achat/buy
          if (key.toLowerCase().includes('buy') || key.toLowerCase().includes('achat')) {
            const modal = new ModalBuilder()
              .setCustomId(`ticket:modal:${key}`)
              .setTitle('Informations de commande');

            const productInput = new TextInputBuilder()
              .setCustomId('product')
              .setLabel('Quel produit souhaitez-vous acheter ?')
              .setPlaceholder('Ex: Nitro Boost, Spotify Premium...')
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(productInput));
            await interaction.showModal(modal);
            return;
          }

          // Sinon ouverture normale
          const cfg = await getConfig(interaction.guildId);
// ... (reste du code)
          const max = cfg.ticketMaxPerUser ?? 3;
          const n = await countOpenTickets(interaction.guildId, interaction.user.id);
          if (n >= max) {
            await interaction.reply({
              content: `Tu as déjà **${max}** ticket(s) ouvert(s). Ferme-en un avant d’en rouvrir.`,
              ephemeral: true,
            });
            return;
          }
          await interaction.deferReply({ ephemeral: true });
          try {
            const ch = await createTicketChannel(
              interaction.guild,
              interaction.member,
              key,
              cfg
            );
            await interaction.editReply({
              content: `Ticket créé : ${ch}`,
            });
          } catch (e) {
            console.error(e);
            await interaction.editReply({
              content:
                'Impossible de créer le ticket. Vérifie la **catégorie parent**, les **permissions du bot** et les **rôles staff**.',
            });
          }
          return;
        }

        if (id === 'ticket:close') {
          const cfg = await getConfig(interaction.guildId);
          await closeTicket(interaction, cfg);
          return;
        }

        if (id.startsWith('exchange:open:')) {
          const pair = id.slice('exchange:open:'.length);
          const modal = new ModalBuilder()
            .setCustomId(`exchange:submit:${pair}`)
            .setTitle(`Échange ${pair.toUpperCase()}`);

          const amount = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('Montant que vous envoyez')
            .setPlaceholder('Ex: 10')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(amount));
          await interaction.showModal(modal);
          return;
        }

        if (id.startsWith('review:open:')) {
          const parts = id.split(':');
          const guildId = parts[2];
          const targetUserId = parts[3];
          if (interaction.user.id !== targetUserId) {
            await interaction.reply({
              content: 'Ce bouton est réservé au client concerné.',
              ephemeral: true,
            });
            return;
          }
          const modal = new ModalBuilder()
            .setCustomId(`review:submit:${guildId}:${targetUserId}`)
            .setTitle('Laisser un avis');

          const stars = new TextInputBuilder()
            .setCustomId('stars')
            .setLabel('Note de 1 à 5')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(1);

          const comment = new TextInputBuilder()
            .setCustomId('comment')
            .setLabel('Commentaire (optionnel)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

          const order = new TextInputBuilder()
            .setCustomId('order')
            .setLabel('Référence commande (optionnel)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          modal.addComponents(
            new ActionRowBuilder().addComponents(stars),
            new ActionRowBuilder().addComponents(comment),
            new ActionRowBuilder().addComponents(order)
          );
          await interaction.showModal(modal);
          return;
        }
      }

      if (interaction.isStringSelectMenu()) {
        const id = interaction.customId;
        if (id === 'exchange:select') {
          const pair = interaction.values[0];
          const modal = new ModalBuilder()
            .setCustomId(`exchange:submit:${pair}`)
            .setTitle(`Échange ${pair.toUpperCase()}`);

          const amount = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel('Montant que vous envoyez')
            .setPlaceholder('Ex: 10')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(amount));
          await interaction.showModal(modal);
          return;
        }
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket:modal:')) {
        const key = interaction.customId.slice('ticket:modal:'.length);
        const product = interaction.fields.getTextInputValue('product');
        
        const cfg = await getConfig(interaction.guildId);
        const max = cfg.ticketMaxPerUser ?? 3;
        const n = await countOpenTickets(interaction.guildId, interaction.user.id);
        
        if (n >= max) {
          await interaction.reply({
            content: `Tu as déjà **${max}** ticket(s) ouvert(s). Ferme-en un avant d’en rouvrir.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        try {
          const ch = await createTicketChannel(
            interaction.guild,
            interaction.member,
            key,
            cfg,
            product // On passe le produit ici
          );
          await interaction.editReply({
            content: `Ticket créé : ${ch}`,
          });
        } catch (e) {
          console.error(e);
          await interaction.editReply({
            content: 'Impossible de créer le ticket.',
          });
        }
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('review:submit:')) {
        const parts = interaction.customId.split(':');
        const guildId = parts[2];
        const userId = parts[3];
        if (interaction.user.id !== userId) {
          await interaction.reply({ content: 'Erreur de session.', ephemeral: true });
          return;
        }
        const rawStars = interaction.fields.getTextInputValue('stars').trim();
        const s = parseInt(rawStars, 10);
        if (Number.isNaN(s) || s < 1 || s > 5) {
          await interaction.reply({
            content: 'La note doit être un chiffre entre **1** et **5**.',
            ephemeral: true,
          });
          return;
        }
        const comment = interaction.fields.getTextInputValue('comment') || '';
        const orderRef = interaction.fields.getTextInputValue('order') || '';

        const cfg = await getConfig(guildId);
        const chId = cfg.reviewChannelId;
        if (!chId) {
          await interaction.reply({
            content: 'Le salon d’avis n’est pas configuré sur ce serveur.',
            ephemeral: true,
          });
          return;
        }

        await Review.create({
          guildId,
          userId,
          stars: s,
          comment,
          orderRef,
        });

        const guild = interaction.client.guilds.cache.get(guildId);
        const ch = guild?.channels.cache.get(chId);
        const starStr = '⭐'.repeat(s) + '☆'.repeat(5 - s);
        const embed = new EmbedBuilder()
          .setTitle('Nouvel avis')
          .setColor(0xfeb900)
          .setDescription(starStr)
          .addFields(
            { name: 'Client', value: `<@${userId}>`, inline: true },
            { name: 'Note', value: String(s), inline: true },
            { name: 'Commande', value: orderRef || '—', inline: true },
            { name: 'Commentaire', value: comment || '—', inline: false }
          )
          .setTimestamp();

        const template = cfg.reviewRequestEmbed;
        if (template?.color) embed.setColor(template.color);

        if (ch?.isTextBased()) {
          await ch.send({ embeds: [embed] });
        }

        await interaction.reply({
          content: 'Merci ! Ton avis a été publié.',
          ephemeral: true,
        });
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('exchange:submit:')) {
        const pair = interaction.customId.slice('exchange:submit:'.length);
        const amountStr = interaction.fields.getTextInputValue('amount').replace(',', '.');
        const amount = parseFloat(amountStr);

        if (isNaN(amount) || amount <= 0) {
          await interaction.reply({ content: 'Montant invalide.', ephemeral: true });
          return;
        }

        const cfg = await getConfig(interaction.guildId);
        const rateData = cfg.exchangerConfig?.rates?.[pair];
        const rate = typeof rateData === 'object' ? rateData.rate : rateData;

        if (!rate) {
          await interaction.reply({
            content: 'Ce taux de change n’est plus disponible.',
            ephemeral: true,
          });
          return;
        }

        const result = (amount * rate).toFixed(2);
        await interaction.deferReply({ ephemeral: true });

        try {
          const ch = await createExchangeTicket(
            interaction.guild,
            interaction.member,
            pair,
            amount,
            result,
            cfg
          );
          await interaction.editReply({ content: `Ticket d’échange créé : ${ch}` });
        } catch (e) {
          console.error(e);
          await interaction.editReply({ content: 'Erreur lors de la création du ticket.' });
        }
        return;
      }
    } catch (err) {
      console.error('interactionCreate ERROR:', err.message);
      console.error('Stack:', err.stack);
      if (err.cause) console.error('Cause:', err.cause);
      
      // Envoyer la raison de l'erreur en MP à l'utilisateur
      try {
        const user = await interaction.client.users.fetch(interaction.user.id);
        let errorReason = err.message || err.toString() || 'Erreur inconnue';
        // Tronquer si trop long
        if (errorReason.length > 1800) errorReason = errorReason.slice(0, 1800) + '...';
        await user.send({
          content: `⚠️ **Une erreur est survenue**\n\n**Raison:** \`${errorReason}\`\n\nContacte un administrateur si le problème persiste.`
        });
      } catch (dmErr) {
        // Si MP impossible, répondre dans le channel
        console.error('Impossible d\'envoyer le MP:', dmErr.message);
      }
      
      // Réponse éphémère dans le channel
      const msg = { content: '❌ Une erreur est survenue. Regarde tes MPs pour la raison.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  },
};
