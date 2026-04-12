const fs = require('fs');
const path = require('path');

function loadCommands(client, dir = path.join(__dirname, 'commands')) {
  const slash = new Map();
  const prefix = new Map();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const mod = require(path.join(dir, file));
    if (mod.slashData) {
      const name = mod.slashData.name;
      slash.set(name, mod);
    }
    if (mod.name) {
      prefix.set(mod.name, mod);
      for (const a of mod.aliases || []) {
        prefix.set(a, mod);
      }
    }
  }
  client.slashCommands = slash;
  client.prefixCommands = prefix;
}

module.exports = { loadCommands };
