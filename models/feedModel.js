const mongoose = require("mongoose");

const feedSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // image/video
    language: { type: String, required: false, default: null },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
      required: true,
    },
    duration: { type: Number, default: null },
    contentUrl: { type: String, required: true },
    dec: { type: String },

    cloudinaryId: { type: String },
    fileHash: { type: String, index: true },

    createdByAccount: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "roleRef",
      required: true,
    },
    roleRef: {
      type: String,
      enum: ["Admin", "Child_Admin", "User"],
      default: "User",
    },

    // Pre-computed theme color (extracted at upload time for fast retrieval)
    themeColor: {
      primary: { type: String, default: "#ffffff" },
      secondary: { type: String, default: "#cccccc" },
      accent: { type: String, default: "#50C878" },
      text: { type: String, default: "#000000" },
      gradient: { type: String, default: "linear-gradient(135deg, #ffffff, #cccccc, #999999)" },
    },

    isScheduled: { type: Boolean, default: false },
    scheduleDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Pending", "Published", "Draft"],
      default: "Published",
    },
  },
  { timestamps: true }
);

feedSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster category-based queries (speeds up category post loading)
feedSchema.index({ category: 1, createdAt: -1 });

// Index for faster general feed queries
feedSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Feed", feedSchema, "Feeds");
