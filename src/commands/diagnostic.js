const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { getConfig } = require('../util/permissions');
const { connectMongo } = require('../util/db');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'diagnostic',
  description: 'Vérification complète du bot et des configurations',
  slashData: new SlashCommandBuilder()
    .setName('diagnostic')
    .setDescription('Diagnostique complet du bot, configs et erreurs potentielles'),

  async executeSlash(interaction) {
    // Vérifier les permissions
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ Permission **Gérer le serveur** requise.',
        ephemeral: true,
      });
    }

    const diagnostics = [];
    const errors = [];
    const warnings = [];
    
    // Fonction helper pour envoyer des messages
    let replied = false;
    const send = async (content) => {
      try {
        if (!replied) {
          await interaction.reply({ content, ephemeral: true });
          replied = true;
        } else {
          await interaction.followUp({ content, ephemeral: true });
        }
      } catch (e) {
        console.error('Erreur envoi message:', e.message);
        // Essayer en MP
        try {
          await interaction.user.send(content.slice(0, 2000));
        } catch (dmErr) {
          console.error('MP aussi échoué:', dmErr.message);
        }
      }
    };

    // 1. Vérification environnement
    diagnostics.push('🔍 **Diagnostic complet du bot**\n');
    
    // Variables d'environnement
    const token = process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;
    const mongo = process.env.MONGO_URL || process.env.DATABASE_URL;
    
    if (!token) errors.push('❌ Variable DISCORD_TOKEN manquante');
    else diagnostics.push('✅ Token Discord présent');
    
    if (!mongo) errors.push('❌ Variable MONGO_URL/DATABASE_URL manquante');
    else diagnostics.push('✅ URL MongoDB présente');

    // 2. Vérification connexion Discord
    try {
      const client = interaction.client;
      diagnostics.push(`\n📡 **Discord:**`);
      diagnostics.push(`✅ Connecté en tant que ${client.user?.tag || 'Inconnu'}`);
      diagnostics.push(`✅ Latence: ${client.ws.ping}ms`);
      diagnostics.push(`✅ Guildes: ${client.guilds.cache.size}`);
    } catch (e) {
      errors.push(`❌ Erreur connexion Discord: ${e.message}`);
    }

    // 3. Vérification MongoDB
    try {
      diagnostics.push(`\n🗄️ **MongoDB:**`);
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        diagnostics.push('✅ Connecté à MongoDB');
      } else {
        warnings.push('⚠️ MongoDB non connecté (état: ' + mongoose.connection.readyState + ')');
      }
    } catch (e) {
      errors.push(`❌ Erreur MongoDB: ${e.message}`);
    }

    // 4. Vérification config serveur
    let cfg;
    try {
      diagnostics.push(`\n⚙️ **Configuration serveur:**`);
      cfg = await getConfig(interaction.guild.id);
      
      if (cfg) {
        diagnostics.push('✅ Config trouvée en base');
        
        // Vérifier les catégories de tickets
        const cats = cfg.ticketCategories || [];
        diagnostics.push(`📁 Catégories tickets: ${cats.length}`);
        
        cats.forEach((cat, idx) => {
          if (!cat.id) errors.push(`❌ Catégorie ${idx}: ID manquant`);
          if (!cat.label) errors.push(`❌ Catégorie ${idx}: Label manquant`);
          if (!cat.style) warnings.push(`⚠️ Catégorie ${cat.id || idx}: Style manquant (défaut: Secondary)`);
        });

        // Vérifier panel embed
        if (cfg.ticketPanelEmbed) {
          const embed = cfg.ticketPanelEmbed;
          if (embed.color !== undefined && typeof embed.color !== 'number') {
            errors.push(`❌ ticketPanelEmbed.color doit être un nombre, reçu: ${typeof embed.color}`);
          }
          if (embed.title && typeof embed.title !== 'string') {
            errors.push(`❌ ticketPanelEmbed.title doit être une string`);
          }
        }

        // Vérifier exchanger
        if (cfg.exchangerConfig?.rates) {
          const rates = Object.entries(cfg.exchangerConfig.rates);
          diagnostics.push(`💱 Paires exchanger: ${rates.length}`);
          
          rates.forEach(([pair, data]) => {
            if (!pair) errors.push(`❌ Paire exchanger sans nom`);
            const rate = typeof data === 'number' ? data : data?.rate;
            if (rate === undefined || rate === null) {
              errors.push(`❌ Paire ${pair}: Taux manquant`);
            }
          });
        }
      } else {
        warnings.push('⚠️ Aucune config trouvée pour ce serveur');
      }
    } catch (e) {
      errors.push(`❌ Erreur config: ${e.message}`);
    }

    // 5. Vérification des salons
    try {
      diagnostics.push(`\n📺 **Salons configurés:**`);
      const guild = interaction.guild;
      
      if (cfg?.ticketPanelChannelId) {
        const ch = guild.channels.cache.get(cfg.ticketPanelChannelId);
        if (ch) diagnostics.push(`✅ Salon panel tickets: ${ch.name}`);
        else errors.push(`❌ Salon panel tickets introuvable: ${cfg.ticketPanelChannelId}`);
      } else {
        warnings.push('⚠️ Salon panel tickets non configuré');
      }

      if (cfg?.ticketCategoryId) {
        const cat = guild.channels.cache.get(cfg.ticketCategoryId);
        if (cat) diagnostics.push(`✅ Catégorie tickets: ${cat.name}`);
        else errors.push(`❌ Catégorie tickets introuvable: ${cfg.ticketCategoryId}`);
      } else {
        warnings.push('⚠️ Catégorie tickets non configurée');
      }
    } catch (e) {
      errors.push(`❌ Erreur salons: ${e.message}`);
    }

    // 6. Vérification fichiers critiques
    try {
      diagnostics.push(`\n📁 **Fichiers système:**`);
      const criticalFiles = [
        'src/util/embeds.js',
        'src/util/ticketPanel.js',
        'src/services/ticketService.js',
        'src/events/interactionCreate.js',
      ];
      
      criticalFiles.forEach(file => {
        const fullPath = path.join(__dirname, '..', '..', file);
        if (fs.existsSync(fullPath)) {
          diagnostics.push(`✅ ${file}`);
        } else {
          errors.push(`❌ ${file} manquant`);
        }
      });
    } catch (e) {
      errors.push(`❌ Erreur vérification fichiers: ${e.message}`);
    }

    // 7. Vérification Components V2
    try {
      diagnostics.push(`\n🎨 **Components V2:**`);
      const { ContainerBuilder, SectionBuilder, TextDisplayBuilder } = require('discord.js');
      
      // Test création basique
      const testComponents = [
        new SectionBuilder({
          components: [new TextDisplayBuilder({ content: 'Test' })]
        })
      ];
      const testContainer = new ContainerBuilder({ components: testComponents });
      
      if (testContainer) {
        diagnostics.push('✅ ContainerBuilder fonctionne');
        diagnostics.push('✅ SectionBuilder fonctionne');
        diagnostics.push('✅ TextDisplayBuilder fonctionne');
      }
    } catch (e) {
      errors.push(`❌ Erreur Components V2: ${e.message}`);
    }

    // Assemblage du rapport
    let report = diagnostics.join('\n') + '\n\n';
    
    if (errors.length > 0) {
      report += `**❌ ERREURS (${errors.length}):**\n` + errors.join('\n') + '\n\n';
    }
    
    if (warnings.length > 0) {
      report += `**⚠️ AVERTISSEMENTS (${warnings.length}):**\n` + warnings.join('\n') + '\n\n';
    }

    if (errors.length === 0 && warnings.length === 0) {
      report += '🎉 **Aucun problème détecté !**';
    }

    // Envoyer le rapport par morceaux
    const chunks = report.match(/[\s\S]{1,1900}/g) || [report];
    
    for (let i = 0; i < chunks.length; i++) {
      const content = i === 0 ? chunks[i] : '...' + chunks[i];
      await send(content);
    }

    // Envoyer aussi en MP si des erreurs critiques
    if (errors.length > 0) {
      try {
        await interaction.user.send({
          content: `🔴 **Erreurs critiques sur ${interaction.guild.name}:**\n\n${errors.slice(0, 10).join('\n')}`
        });
      } catch (e) {
        // Ignore MP error
      }
    }
  },
};
