const express = require("express");
const router = express.Router();
const {recallMessage, getChats, getChatMessages } = require("../controllers/chatController");

router.get("/", getChats);
router.get("/:chatId/messages", getChatMessages);
router.post("/:messageId/recall", recallMessage);

module.exports = router;