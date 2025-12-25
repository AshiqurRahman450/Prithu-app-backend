/**
 * Migration Script: Add theme colors to existing feeds
 * Run this script once to populate themeColor for existing feeds
 * 
 * Usage: node scripts/migrateThemeColors.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Feed = require("../models/feedModel");
const { extractThemeColor } = require("../middlewares/helper/extractThemeColor");

const BATCH_SIZE = 10; // Process 10 feeds at a time to avoid overwhelming the server
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function migrateThemeColors() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Connected to MongoDB");

        // Find feeds without themeColor or with default themeColor
        const feedsWithoutTheme = await Feed.find({
            $or: [
                { themeColor: { $exists: false } },
                { "themeColor.primary": "#ffffff", "themeColor.accent": "#50C878" }, // Default values
            ],
        })
            .select("_id type contentUrl themeColor")
            .lean();

        console.log(`📦 Found ${feedsWithoutTheme.length} feeds to process`);

        if (feedsWithoutTheme.length === 0) {
            console.log("✅ All feeds already have theme colors!");
            process.exit(0);
        }

        let processed = 0;
        let failed = 0;

        // Process in batches
        for (let i = 0; i < feedsWithoutTheme.length; i += BATCH_SIZE) {
            const batch = feedsWithoutTheme.slice(i, i + BATCH_SIZE);

            console.log(
                `\n🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
                    feedsWithoutTheme.length / BATCH_SIZE
                )} (feeds ${i + 1}-${Math.min(i + BATCH_SIZE, feedsWithoutTheme.length)})`
            );

            // Process batch in parallel
            const results = await Promise.allSettled(
                batch.map(async (feed) => {
                    try {
                        const feedType = feed.type === "video" ? "video" : "image";
                        const themeColor = await extractThemeColor(feed.contentUrl, feedType);

                        await Feed.findByIdAndUpdate(feed._id, { themeColor });
                        return { id: feed._id, success: true };
                    } catch (err) {
                        return { id: feed._id, success: false, error: err.message };
                    }
                })
            );

            // Count results
            results.forEach((result) => {
                if (result.status === "fulfilled" && result.value.success) {
                    processed++;
                    console.log(`  ✅ ${result.value.id}`);
                } else {
                    failed++;
                    const error = result.status === "rejected" ? result.reason : result.value.error;
                    console.log(`  ❌ ${result.value?.id || "unknown"}: ${error}`);
                }
            });

            console.log(`  📊 Progress: ${processed}/${feedsWithoutTheme.length} (${failed} failed)`);

            // Delay before next batch
            if (i + BATCH_SIZE < feedsWithoutTheme.length) {
                console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
                await sleep(DELAY_BETWEEN_BATCHES);
            }
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   📊 Processed: ${processed}`);
        console.log(`   ❌ Failed: ${failed}`);

        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrateThemeColors();
