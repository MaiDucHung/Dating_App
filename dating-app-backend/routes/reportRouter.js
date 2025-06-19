const express = require("express");
const router = express.Router();

const { blockUser, reportUser, getUserProfile } = require("../controllers/reportController");

router.post("/:userId/block", blockUser);
router.post("/:userId/report", reportUser);
router.get("/:userId", getUserProfile);

module.exports = router;