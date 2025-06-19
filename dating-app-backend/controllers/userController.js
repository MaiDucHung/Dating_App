const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const pauseProfile = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const userId = decoded.userId;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lấy trạng thái hiện tại của is_active
    const [currentStatus] = await connection.query(
      "SELECT is_active FROM Users WHERE id = ?",
      [userId]
    );

    if (currentStatus.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    const currentIsActive = currentStatus[0].is_active;
    const newIsActive = currentIsActive === 1 ? 0 : 1; // Toggle trạng thái

    const [result] = await connection.query(
      "UPDATE Users SET is_active = ? WHERE id = ?",
      [newIsActive, userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    await connection.commit();
    res.status(200).json({ message: `Profile ${newIsActive === 1 ? "reactivated" : "paused"} successfully`, is_active: newIsActive });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error pausing/reactivating profile:", error.message, error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// Get list of blocked users
const getBlockedUsers = async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log("Decoded token payload:", decoded);
      if (!decoded || !decoded.userId) {
        throw new Error("Invalid token payload: userId not found");
      }
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    const userId = decoded.userId;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const sql = `
      SELECT 
        b.blocked_id AS id,
        u.username AS name
      FROM BlockedUsers b
      JOIN Users u ON b.blocked_id = u.id
      WHERE b.blocker_id = ?
    `;
    console.log("Executing SQL with userId:", userId);
    const [blockedUsers] = await connection.query(sql, [userId]);

    if (!blockedUsers || blockedUsers.length === 0) {
      console.log("No blocked users found for userId:", userId);
      return res.status(200).json([]);
    }

    await connection.commit();
    console.log("Blocked users fetched:", blockedUsers);
    res.status(200).json(blockedUsers);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error fetching blocked users for userId: ${userId || "unknown"} - ${error.message}`, {
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({ 
      message: "Server error: " + error.message, 
      stack: error.stack,
      code: error.code,
    });
  } finally {
    if (connection) connection.release();
  }
};

// Unblock a user
const unblockUser = async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const blockedId = req.params.blockedId;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.query(
      `
      DELETE FROM BlockedUsers 
      WHERE blocker_id = ? AND blocked_id = ?
      `,
      [userId, blockedId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found in blocked list" });
    }

    await connection.commit();
    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error unblocking user for userId: ${req.userId || "unknown"} - ${error.message}`);
    res.status(500).json({ message: "Server error: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};

// Delete user account
const deleteAccount = async (req, res) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lấy tất cả match_id liên quan đến userId
    const [matches] = await connection.query(
      `
      SELECT id FROM Matches WHERE user1_id = ? OR user2_id = ?
      `,
      [userId, userId]
    );

    const matchIds = matches.map(match => match.id);

    // Xóa Messages dựa trên match_id
    if (matchIds.length > 0) {
      await connection.query(
        `
        DELETE FROM Messages WHERE match_id IN (?)
        `,
        [matchIds]
      );
    }

    // Xóa các bảng con khác
    await connection.query("DELETE FROM BlockedUsers WHERE blocker_id = ? OR blocked_id = ?", [userId, userId]);
    await connection.query("DELETE FROM Matches WHERE user1_id = ? OR user2_id = ?", [userId, userId]);
    await connection.query("DELETE FROM Photos WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM Profiles WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM Preferences WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM Notifications WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM Reports WHERE reporter_id = ? OR reported_user_id = ?", [userId, userId]);
    // Xóa bảng cha cuối cùng
    await connection.query("DELETE FROM Users WHERE id = ?", [userId]);

    await connection.commit();
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error deleting account for userId: ${req.userId || "unknown"} - ${error.message}`);
    res.status(500).json({ message: "Server error: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {pauseProfile, getBlockedUsers, unblockUser, deleteAccount };