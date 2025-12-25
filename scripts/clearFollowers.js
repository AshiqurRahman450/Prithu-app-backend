// Clear all CreatorFollower data
const mongoose = require('mongoose');

// Get MongoDB URI from environment or use default
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/prithu';

console.log('🔄 Connecting to MongoDB...');

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        const collection = mongoose.connection.db.collection('CreatorFollowers');

        // Count before
        const countBefore = await collection.countDocuments();
        console.log(`📊 Documents before: ${countBefore}`);

        // Delete all
        const result = await collection.deleteMany({});
        console.log(`🗑️  Deleted: ${result.deletedCount} documents`);

        // Count after
        const countAfter = await collection.countDocuments();
        console.log(`📊 Documents after: ${countAfter}`);

        console.log('\n✅ SUCCESS! All follow data cleared.');
        console.log('👉 Now you can test follow/unfollow with fresh data.');

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection Error:', err.message);
        console.log('\n💡 Make sure:');
        console.log('   1. MongoDB is running');
        console.log('   2. MONGO_URI is set in .env file');
        console.log('   3. Connection string is correct');
        process.exit(1);
    });
