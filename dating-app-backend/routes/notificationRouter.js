const express = require("express");
const router = express.Router();
const { getNotifications, notifyLike, clearReadNotifications } = require("../controllers/notificationController");

router.get("/", getNotifications);
router.delete("/clear-read", clearReadNotifications);
router.post("/notify-like", notifyLike);

module.exports = router;