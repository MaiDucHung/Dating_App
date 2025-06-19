const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const profileController = require("../controllers/profileController");
const matchController = require("../controllers/matchController");

router.post("/match", authMiddleware, profileController.sendMatchData);
router.post("/like-after", authMiddleware, matchController.likeAfterDislike);
router.get("/matches", authMiddleware, (req, res) => {
  res.json({ message: "Protected matches route" });
});

module.exports = router;