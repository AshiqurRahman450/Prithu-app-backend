// Quick diagnostic script to check CreatorFollower collection
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB\n');

        const collection = mongoose.connection.db.collection('CreatorFollowers');

        // Get total count
        const totalCount = await collection.countDocuments();
        console.log(`📊 Total documents: ${totalCount}`);

        // Get sample documents
        const samples = await collection.find().limit(5).toArray();
        console.log('\n📝 Sample documents:');
        samples.forEach((doc, i) => {
            console.log(`\n${i + 1}.`, JSON.stringify(doc, null, 2));
        });

        // Check structure
        const hasOldStructure = await collection.countDocuments({ followerIds: { $exists: true } });
        const hasNewStructure = await collection.countDocuments({ followerId: { $exists: true } });

        console.log(`\n📋 Structure Analysis:`);
        console.log(`   Old structure (with followerIds array): ${hasOldStructure}`);
        console.log(`   New structure (with followerId field): ${hasNewStructure}`);

        if (hasOldStructure > 0) {
            console.log('\n⚠️  WARNING: Old structure detected! Need to clear or migrate.');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
