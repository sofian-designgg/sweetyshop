require('dotenv').config();
const { registerSlashCommands } = require('./registerSlashCommands');

(async () => {
  try {
    await registerSlashCommands({ required: true });
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
})();
