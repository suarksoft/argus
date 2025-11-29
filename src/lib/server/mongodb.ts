import { MongoClient, Db, Document } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add MONGODB_URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve connection across HMR
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
    console.log('MongoDB: New connection created (development)');
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
  console.log('MongoDB: New connection created (production)');
}

// Export a promise for the MongoDB client
export default clientPromise;

// Helper to get database
export async function getDatabase(dbName: string = 'argus'): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

// Helper to get collections
export async function getCollection<T extends Document = Document>(collectionName: string) {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await clientPromise;
    await client.db('admin').command({ ping: 1 });
    console.log('MongoDB: Connection successful');
    return true;
  } catch (error) {
    console.error('MongoDB: Connection failed', error);
    return false;
  }
}

