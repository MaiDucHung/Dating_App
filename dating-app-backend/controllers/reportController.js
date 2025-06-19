const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const blockUser = async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const userId = decoded.userId;
    const blockedUserId = req.params.userId;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Kiểm tra xem user có tồn tại không
    const [user] = await connection.query("SELECT * FROM Users WHERE id = ?", [blockedUserId]);
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Kiểm tra xem đã block chưa
    const [existingBlock] = await connection.query(
      "SELECT * FROM BlockedUsers WHERE user_id = ? AND blocked_user_id = ?",
      [userId, blockedUserId]
    );
    if (existingBlock.length > 0) {
      return res.status(400).json({ message: "User already blocked" });
    }

    // Thêm vào bảng BlockedUsers
    await connection.query(
      "INSERT INTO BlockedUsers (user_id, blocked_user_id) VALUES (?, ?)",
      [userId, blockedUserId]
    );

    await connection.commit();
    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error blocking user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const reportUser = async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const userId = decoded.userId;
    const reportedUserId = req.params.userId;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Kiểm tra xem user có tồn tại không
    const [user] = await connection.query("SELECT * FROM Users WHERE id = ?", [reportedUserId]);
    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Thêm vào bảng Reports
    await connection.query(
      "INSERT INTO Reports (user_id, reported_user_id, reason, created_at) VALUES (?, ?, ?, NOW())",
      [userId, reportedUserId, "Reported via chat"]
    );

    await connection.commit();
    res.status(200).json({ message: "User reported successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error reporting user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const getUserProfile = async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const userId = req.params.userId;

    connection = await pool.getConnection();
    const [user] = await connection.query(
      `
      SELECT id, username, age, city, bio, hobbies, height, relationship_status, looking_for, imgUrl
      FROM Users
      WHERE id = ?
      `,
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [photos] = await connection.query(
      "SELECT id, photo_url AS imgUrl FROM Photos WHERE user_id = ?",
      [userId]
    );

    const userProfile = {
      ...user[0],
      hobbies: user[0].hobbies ? user[0].hobbies.split(",") : [],
      photos: photos.map((photo) => ({
        id: photo.id,
        imgUrl: `${BASE_URL}${photo.imgUrl}`,
      })),
    };

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
const unblockUser = async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const blockerId = decoded.userId;
    const blockedId = req.params.userId;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      "DELETE FROM BlockedUsers WHERE blocker_id = ? AND blocked_id = ?",
      [blockerId, blockedId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Block not found" });
    }

    await connection.commit();
    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Server error: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { blockUser, reportUser, getUserProfile ,unblockUser};