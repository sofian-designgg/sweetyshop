const mongoose = require('mongoose');

async function connectMongo(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
}

module.exports = { connectMongo };
