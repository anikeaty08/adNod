import mongoose from "mongoose";

let isConnected = false;

export async function connectDatabase() {
  if (isConnected) return mongoose.connection;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set. Add it to your local .env before starting the API.");
  }

  await mongoose.connect(uri, {
    dbName: "adnode",
  });

  isConnected = true;
  return mongoose.connection;
}
