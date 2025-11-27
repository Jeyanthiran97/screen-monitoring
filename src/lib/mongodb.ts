import mongoose from "mongoose";

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI;

// In production, fail fast if MONGODB_URI is not set
if (!MONGODB_URI) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MONGODB_URI environment variable is required in production. " +
        "Please set it in your Vercel project settings."
    );
  }
  // In development, use localhost as fallback
  console.warn("MONGODB_URI not set, using default localhost connection");
}

const finalMongoUri: string = MONGODB_URI || "mongodb://localhost:27017/screen-monitoring";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(finalMongoUri, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log("✅ MongoDB connected successfully");
  } catch (e: any) {
    cached.promise = null;
    console.error("❌ MongoDB connection error:", e.message);
    if (process.env.NODE_ENV === "production") {
      console.error(
        "Make sure MONGODB_URI is set correctly in Vercel environment variables"
      );
    }
    throw e;
  }

  return cached.conn;
}

export default connectDB;
