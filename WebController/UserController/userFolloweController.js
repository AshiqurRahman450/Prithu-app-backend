
const CreatorFollower = require("../../models/creatorFollowerModel"); // CreatorFollowers
const ProfileSettings = require("../../models/profileSettingModel");
const mongoose = require("mongoose");
const { feedTimeCalculator } = require("../../middlewares/feedTimeCalculator");

// ✅ Get Following List
exports.getUserFollowing = async (req, res) => {
  try {
    const userId = req.body.userId || req.Id || req.params.userId;
    console.log("getUserFollowing for userId:", userId)
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1️⃣ Find who the user follows
    const followings = await CreatorFollower.find(
      { followerId: userObjectId },
      { creatorId: 1, createdAt: 1 }
    ).lean();

    if (followings.length === 0) {
      return res.status(200).json({ success: true, count: 0, following: [] });
    }

    // 2️⃣ Extract all creator IDs
    const creatorIds = followings.map(f => f.creatorId);

    // 3️⃣ Fetch their profile settings
    const profiles = await ProfileSettings.find(
      { userId: { $in: creatorIds } },
      { userId: 1, userName: 1, displayName: 1, profileAvatar: 1 }
    ).lean();

    // 4️⃣ Combine profile + follow time
    const result = followings.map(f => {
      const profile = profiles.find(p => p.userId.toString() === f.creatorId.toString());
      return {
        userId: f.creatorId,
        userName: profile?.userName || "Unknown",
        displayName: profile?.displayName || "",
        profileAvatar: profile?.profileAvatar || "",
        followedAt: feedTimeCalculator(f.createdAt),
      };
    });

    return res.status(200).json({ success: true, count: result.length, following: result });

  } catch (error) {
    console.error("❌ Error fetching following:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching following list",
      error: error.message,
    });
  }
};


// ✅ Get Followers List
exports.getUserFollowers = async (req, res) => {
  try {
    const userId = req.body.userId || req.Id || req.query.id;
    const currentUserId = req.Id; // The logged-in user making the request
    console.log("getUserFollowers for userId:", userId, "currentUserId:", currentUserId);

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const currentUserObjectId = currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null;

    // 1️⃣ Find all followers
    const followers = await CreatorFollower.find(
      { creatorId: userObjectId },
      { followerId: 1, createdAt: 1 }
    ).lean();

    if (followers.length === 0) {
      return res.status(200).json({ success: true, count: 0, followers: [] });
    }

    // 2️⃣ Extract user IDs
    const followerIds = followers.map(f => f.followerId);

    // 3️⃣ Fetch follower profiles
    const profiles = await ProfileSettings.find(
      { userId: { $in: followerIds } },
      { userId: 1, userName: 1, displayName: 1, profileAvatar: 1 }
    ).lean();

    // 4️⃣ Check which followers the current user is following
    let currentUserFollowing = [];
    if (currentUserObjectId) {
      const followingRecords = await CreatorFollower.find(
        { followerId: currentUserObjectId, creatorId: { $in: followerIds } },
        { creatorId: 1 }
      ).lean();
      currentUserFollowing = followingRecords.map(f => f.creatorId.toString());
    }

    // 5️⃣ Combine profile + follow time + isFollowing status
    const result = followers.map(f => {
      const profile = profiles.find(p => p.userId.toString() === f.followerId.toString());
      const isFollowing = currentUserFollowing.includes(f.followerId.toString());
      return {
        userId: f.followerId,
        userName: profile?.userName || "Unknown",
        displayName: profile?.displayName || "",
        profileAvatar: profile?.profileAvatar || "",
        followedAt: feedTimeCalculator(f.createdAt),
        isFollowing: isFollowing, // Whether current user follows this follower
      };
    });

    return res.status(200).json({ success: true, count: result.length, followers: result });

  } catch (error) {
    console.error("❌ Error fetching followers:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching followers list",
      error: error.message,
    });
  }
};

