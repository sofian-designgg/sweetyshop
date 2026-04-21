const { Config } = require('../database');

// Récupérer la config d'un serveur
async function getConfig(guildId) {
  let config = await Config.findOne({ guildId });
  if (!config) {
    config = new Config({ guildId });
    await config.save();
  }
  return config;
}

// Vérifier si un membre est admin
async function isAdmin(member, guildId) {
  // Permission ManageGuild = admin
  if (member.permissions.has('ManageGuild')) return true;
  
  const cfg = await getConfig(guildId);
  
  // Vérifier les rôles admin
  if (cfg.adminRoleIds?.length > 0) {
    const hasRole = member.roles.cache.some(role => 
      cfg.adminRoleIds.includes(role.id)
    );
    if (hasRole) return true;
  }
  
  return false;
}

// Vérifier si un membre est staff ticket
async function isTicketStaff(member, guildId) {
  const cfg = await getConfig(guildId);
  
  if (!cfg.ticketStaffRoleIds?.length) return false;
  
  return member.roles.cache.some(role => 
    cfg.ticketStaffRoleIds.includes(role.id)
  );
}

module.exports = {
  getConfig,
  isAdmin,
  isTicketStaff,
};
