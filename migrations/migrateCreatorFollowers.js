/**
 * Migration Script: Convert CreatorFollower from Array to Individual Documents
 * 
 * OLD STRUCTURE:
 * {
 *   creatorId: ObjectId,
 *   followerIds: [ObjectId1, ObjectId2, ...]
 * }
 * 
 * NEW STRUCTURE:
 * {
 *   creatorId: ObjectId,
 *   followerId: ObjectId
 * }
 * 
 * Run this script ONCE to migrate existing data
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'your-mongodb-uri', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', async () => {
    console.log('✅ Connected to MongoDB');

    try {
        const CreatorFollowers = db.collection('CreatorFollowers');

        // Find all documents with the old structure (has followerIds array)
        const oldDocs = await CreatorFollowers.find({ followerIds: { $exists: true } }).toArray();

        console.log(`📊 Found ${oldDocs.length} documents with old structure`);

        if (oldDocs.length === 0) {
            console.log('✅ No migration needed - all data is already in new format');
            process.exit(0);
        }

        let migratedCount = 0;
        let newDocsCreated = 0;

        for (const doc of oldDocs) {
            const { creatorId, followerIds } = doc;

            // Create individual documents for each follower
            for (const followerId of followerIds) {
                try {
                    await CreatorFollowers.insertOne({
                        creatorId,
                        followerId,
                        createdAt: doc.createdAt || new Date(),
                    });
                    newDocsCreated++;
                } catch (err) {
                    // Skip if duplicate (already exists)
                    if (err.code !== 11000) {
                        console.error(`❌ Error creating follow relationship:`, err);
                    }
                }
            }

            // Delete the old document
            await CreatorFollowers.deleteOne({ _id: doc._id });
            migratedCount++;
        }

        console.log(`✅ Migration complete!`);
        console.log(`   - Migrated ${migratedCount} old documents`);
        console.log(`   - Created ${newDocsCreated} new follow relationships`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
});
