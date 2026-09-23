import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let memServerInstance: any = null;

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kumorpara';
  const isProduction = process.env.NODE_ENV === 'production';
  const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

  try {
    // Attempt standard connection
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isProduction ? 10000 : 3000,
    });
    console.log(`[Database] Connected to MongoDB at ${maskedUri}`);
    return mongoose;
  } catch (err: any) {
    if (isProduction) {
      console.error(`[Database] Fatal: Could not connect to production MongoDB at ${maskedUri}: ${err.message}`);
      throw err;
    }

    console.warn(`[Database] Could not connect to MongoDB at ${maskedUri}: ${err.message}`);
    console.log('[Database] Initializing in-memory MongoDB fallback (mongodb-memory-server)...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memServerInstance = await MongoMemoryServer.create();
      const memUri = memServerInstance.getUri();
      await mongoose.connect(memUri);
      console.log(`[Database] In-memory MongoDB connected successfully at ${memUri}`);
      return mongoose;
    } catch (memErr: any) {
      console.error('[Database] Failed to initialize in-memory MongoDB:', memErr);
      throw memErr;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memServerInstance) {
    await memServerInstance.stop();
  }
  console.log('[Database] Disconnected');
}
