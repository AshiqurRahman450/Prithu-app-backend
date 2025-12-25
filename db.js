const mongoose = require("mongoose");
 
 
 
 
// 🟢 2. JOB Database (Separate Job System DB)
const jobDB = mongoose.createConnection(process.env.JOB_DB_URI, {
  maxPoolSize: 20,
  minPoolSize: 5,
  autoIndex: true,
});
 
// Connection logs
 
jobDB.on("connected", () => console.log("✅ JOB DB connected"));
 
jobDB.on("error", (err) => console.error("❌ JOB DB Error:", err));
 
module.exports = { jobDB };