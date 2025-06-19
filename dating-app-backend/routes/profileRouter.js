const express = require("express");
const router = express.Router();
const { 
  updateUserProfile,deletePhoto,
  updateProfile, 
  getProfile, 
  getProfileById,
  discoverProfiles, 
  getMatchedProfiles, 
  getPendingLikes, 
  getDislikedProfiles, 
  sendMatchData, 
  notifyLike,
  blockUser,
  reportUser,
  uploadPhoto 
} = require("../controllers/profileController");

router.put("/me", updateUserProfile);
router.delete("/photos/:id", deletePhoto);

router.put("/update", updateProfile);
router.get("/me", getProfile);
router.get("/discover", discoverProfiles);
router.get("/matched", getMatchedProfiles);
router.get("/pending-likes", getPendingLikes);
router.get("/disliked", getDislikedProfiles);
router.post("/match", sendMatchData);
router.post("/notify-like", notifyLike);
router.get('/:userId', getProfileById);
router.post("/:userId/block", blockUser);
router.post("/:userId/report", reportUser);

router.post("/upload-photo", uploadPhoto);

module.exports = router;