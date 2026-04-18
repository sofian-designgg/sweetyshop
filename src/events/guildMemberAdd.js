const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../util/permissions');
const { embedFromConfig } = require('../util/embeds');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const cfg = await getConfig(member.guild.id);
    if (!cfg.welcomeConfig?.enabled || !cfg.welcomeConfig?.channelId) return;

    const channel = member.guild.channels.cache.get(cfg.welcomeConfig.channelId);
    if (!channel || !channel.isTextBased()) return;

    let embedData = JSON.parse(JSON.stringify(cfg.welcomeConfig.embed || {}));
    
    // Remplacement des variables
    const replaceVars = (str) => {
      if (!str) return str;
      return str
        .replace(/{user}/g, member.toString())
        .replace(/{user_tag}/g, member.user.tag)
        .replace(/{user_name}/g, member.user.username)
        .replace(/{guild_name}/g, member.guild.name)
        .replace(/{member_count}/g, member.guild.memberCount);
    };

    if (embedData.title) embedData.title = replaceVars(embedData.title);
    if (embedData.description) embedData.description = replaceVars(embedData.description);
    if (embedData.footer) embedData.footer = replaceVars(embedData.footer);

    const embed = embedFromConfig(embedData);
    
    // Si l'avatar de l'utilisateur est utilisé comme thumbnail ou image
    if (embedData.thumbnail === '{user_avatar}') embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
    if (embedData.image === '{user_avatar}') embed.setImage(member.user.displayAvatarURL({ dynamic: true, size: 512 }));

    await channel.send({ content: replaceVars(cfg.welcomeConfig.embed?.content || "Bienvenue {user} !"), embeds: [embed] }).catch(console.error);
  },
};
