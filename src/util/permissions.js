const { PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');
const { seedGuildIfNeeded } = require('./seedGuild');

async function getConfig(guildId) {
  let doc = await GuildConfig.findOne({ guildId });
  if (!doc) {
    doc = await GuildConfig.create({ guildId });
  }
  await seedGuildIfNeeded(doc);
  return doc;
}

function hasModPerm(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild);
}

async function isTicketStaff(member, cfg) {
  if (hasModPerm(member)) return true;
  const roles = cfg.ticketStaffRoleIds || [];
  return roles.some((id) => member.roles.cache.has(id));
}

async function isConfigAdmin(member, cfg) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  const extra = cfg.modAdminRoleIds || [];
  return extra.some((id) => member.roles.cache.has(id));
}

module.exports = {
  getConfig,
  hasModPerm,
  isTicketStaff,
  isConfigAdmin,
};
