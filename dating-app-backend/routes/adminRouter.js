const express = require("express");
const router = express.Router();
const {
  loginAdmin,
  verifyAdmin,
  getUsers,
  getReports,
  resolveReport,
  deleteUser,
  sendNotification,
  deleteMatch,
  getMatches,getUserProfile,
} = require("../controllers/adminController");

router.post("/login", loginAdmin); // Đảm bảo endpoint này tồn tại
router.use(verifyAdmin);
router.get("/users", getUsers);
router.get("/reports", getReports);
router.post("/reports/:reportId/resolve", resolveReport);
router.get("/matches", getMatches);
router.delete("/matches/:matchId", deleteMatch);
router.delete("/users/:userId", deleteUser);
router.post('/notifications', sendNotification);
router.get("/users/:userId/profile", getUserProfile);
module.exports = router;