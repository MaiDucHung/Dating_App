const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {pauseProfile, getBlockedUsers, unblockUser, deleteAccount } = require("../controllers/userController");

router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "Protected route", userId: req.user.userId });
});
router.put("/me/pause", pauseProfile);
router.get("/blocked", getBlockedUsers);
router.delete("/blocked/:blockedId", unblockUser);
router.delete("/me", deleteAccount);

module.exports = router;