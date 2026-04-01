const mongoose = require('mongoose');

/**
 * Connect before handling traffic. Wrong host/port (e.g. 27017 vs Docker 27018)
 * otherwise causes "buffering timed out" on the first query.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    console.error(
      'MONGODB_URI is missing. Set it in backend/.env — e.g. mongodb://127.0.0.1:27018/smart-menu (Docker) or mongodb://127.0.0.1:27017/smart-menu (local MongoDB).'
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri.trim(), {
      serverSelectionTimeoutMS: 8000
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    console.log(`MongoDB database: ${mongoose.connection.name} (users must live in this DB for login to work)`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    console.error(
      'Check: is Mongo running? Does MONGODB_URI match your setup? (Docker Compose maps host port 27018 → container 27017.)'
    );
    process.exit(1);
  }
};

module.exports = connectDB;