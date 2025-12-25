/**
 * Script to add test job posts for development
 * Run: node scripts/addTestJobs.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { jobDB } = require("../db");

// Wait for connection
jobDB.on("connected", async () => {
    console.log("✅ Connected to JOB DB");

    try {
        // Define JobPost schema inline (same as your model)
        const JobPostSchema = new mongoose.Schema({
            jobTitle: String,
            companyName: String,
            companyId: mongoose.Schema.Types.ObjectId,
            city: String,
            state: String,
            country: String,
            salaryMin: Number,
            salaryMax: Number,
            salaryType: String,
            employmentType: String,
            workMode: String,
            jobDescription: String,
            requiredSkills: [String],
            minimumExperience: Number,
            maximumExperience: Number,
            status: { type: String, default: "active" },
            isApproved: { type: Boolean, default: true },
            isFeatured: Boolean,
            isPromoted: Boolean,
            createdAt: { type: Date, default: Date.now },
        });

        const JobPost = jobDB.model("JobPost", JobPostSchema, "JobPosts");

        // Check existing jobs
        const existingCount = await JobPost.countDocuments({});
        console.log(`📊 Existing jobs in database: ${existingCount}`);

        if (existingCount > 0) {
            console.log("✅ Jobs already exist, no need to add test data.");
            process.exit(0);
        }

        // Sample test jobs
        const testJobs = [
            {
                jobTitle: "React Native Developer",
                companyName: "TechCorp India",
                city: "Chennai",
                state: "Tamil Nadu",
                country: "India",
                salaryMin: 50000,
                salaryMax: 100000,
                salaryType: "monthly",
                employmentType: "full-time",
                workMode: "hybrid",
                jobDescription: "Looking for experienced React Native developers",
                requiredSkills: ["React Native", "JavaScript", "TypeScript"],
                minimumExperience: 1,
                maximumExperience: 5,
                status: "active",
                isApproved: true,
            },
            {
                jobTitle: "UI/UX Designer",
                companyName: "Design Studio",
                city: "Bangalore",
                state: "Karnataka",
                country: "India",
                salaryMin: 40000,
                salaryMax: 80000,
                salaryType: "monthly",
                employmentType: "full-time",
                workMode: "remote",
                jobDescription: "Creative UI/UX designer needed for mobile apps",
                requiredSkills: ["Figma", "Adobe XD", "Prototyping"],
                minimumExperience: 2,
                maximumExperience: 6,
                status: "active",
                isApproved: true,
            },
            {
                jobTitle: "Backend Developer",
                companyName: "CloudSolutions",
                city: "Mumbai",
                state: "Maharashtra",
                country: "India",
                salaryMin: 60000,
                salaryMax: 120000,
                salaryType: "monthly",
                employmentType: "full-time",
                workMode: "onsite",
                jobDescription: "Node.js backend developer for scalable applications",
                requiredSkills: ["Node.js", "MongoDB", "Express"],
                minimumExperience: 3,
                maximumExperience: 7,
                status: "active",
                isApproved: true,
            },
            {
                jobTitle: "Marketing Intern",
                companyName: "StartupHub",
                city: "Delhi",
                state: "Delhi",
                country: "India",
                salaryMin: 10000,
                salaryMax: 15000,
                salaryType: "monthly",
                employmentType: "internship",
                workMode: "hybrid",
                jobDescription: "Marketing intern for social media management",
                requiredSkills: ["Social Media", "Content Writing", "Canva"],
                minimumExperience: 0,
                maximumExperience: 1,
                status: "active",
                isApproved: true,
            },
        ];

        // Insert test jobs
        const result = await JobPost.insertMany(testJobs);
        console.log(`✅ Added ${result.length} test jobs!`);
        console.log("Job IDs:", result.map(j => j._id));

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
});

jobDB.on("error", (err) => {
    console.error("❌ JOB DB connection error:", err);
    process.exit(1);
});
