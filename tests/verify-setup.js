// tests/verify-setup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

async function verifySetup() {
  console.log('Verifying test environment setup...');

  // Check environment
  dotenv.config({ path: '.env.test' });
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');

  // Verify MongoDB Memory Server
  console.log('\nVerifying MongoDB Memory Server...');
  let mongoServer;
  let client;

  try {
    mongoServer = await MongoMemoryServer.create();
    console.log('✅ MongoDB Memory Server created');

    const uri = mongoServer.getUri();
    console.log('MongoDB Memory Server URI:', uri);

    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB Memory Server');

    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log(`Collections available: ${collections.length}`);

    // Test insert and read
    const testCollection = db.collection('test_setup');
    await testCollection.insertOne({ test: 'data', timestamp: new Date() });
    console.log('✅ Successfully inserted test document');

    const doc = await testCollection.findOne({ test: 'data' });
    console.log('✅ Successfully read test document:', doc ? 'Yes' : 'No');

    // Clean up
    await testCollection.drop();
    console.log('✅ Successfully dropped test collection');
  } catch (error) {
    console.error('❌ MongoDB Memory Server test failed:', error);
    process.exit(1);
  } finally {
    if (client) await client.close();
    console.log('✅ MongoDB client closed');

    if (mongoServer) await mongoServer.stop();
    console.log('✅ MongoDB Memory Server stopped');
  }

  // Verify Jest and dependencies
  console.log('\nVerifying Jest and test dependencies...');
  try {
    require('jest');
    console.log('✅ Jest is installed');

    require('supertest');
    console.log('✅ Supertest is installed');

    require('bcryptjs');
    console.log('✅ bcryptjs is installed');

    require('jsonwebtoken');
    console.log('✅ jsonwebtoken is installed');
  } catch (error) {
    console.error('❌ Dependency check failed:', error.message);
    console.log('Please run: npm install jest supertest mongodb-memory-server --save-dev');
    process.exit(1);
  }

  console.log('\n✅ All checks passed! Test environment is properly set up.');
}

verifySetup()
  .then(() => {
    console.log('Verification complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
  });