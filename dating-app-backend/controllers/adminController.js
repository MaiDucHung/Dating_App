const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const loginAdmin = (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt:", { username, password });
  if (username === "admin" && password === "123") {
    const token = jwt.sign({ username: "admin" }, process.env.JWT_SECRET || "your_jwt_secret", { expiresIn: "1h" });
    return res.json({ token });
  }
  return res.status(401).json({ message: "Invalid credentials" });
};

const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log("Token received:", token); // Đã có log, kiểm tra output
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    console.log("Decoded token:", decoded); // Thêm log để debug
    if (decoded.username !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    console.error("Token verification error:", err.message); // Thêm log lỗi
    return res.status(401).json({ message: "Invalid token" });
  }
};

const getUsers = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [users] = await connection.query("SELECT id, username, email FROM Users");
    console.log("Fetched users:", users); // Thêm log để debug
    if (!Array.isArray(users)) {
      return res.status(500).json({ message: "Unexpected data format from database" });
    }
    return res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err); // Thêm log để debug
    return res.status(500).json({ message: "Error fetching users" });
  } finally {
    connection.release();
  }
};

const getReports = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [reports] = await connection.query('SELECT * FROM Reports WHERE status = "pending"');
    return res.json(reports);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching reports" });
  } finally {
    connection.release();
  }
};
const getMatches = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [matches] = await connection.query(`
      SELECT m.id, u1.username as user1, u2.username as user2
      FROM Matches m
      JOIN Users u1 ON m.user1_id = u1.id
      JOIN Users u2 ON m.user2_id = u2.id
    `);
    return res.json(matches);
  } catch (err) {
    console.error("Error fetching matches:", err); // Thêm log để debug
    return res.status(500).json({ message: "Error fetching matches" });
  } finally {
    connection.release();
  }
};
const resolveReport = async (req, res) => {
  const { reportId } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.query('UPDATE Reports SET status = "resolved" WHERE id = ?', [reportId]);
    return res.json({ message: "Report resolved" });
  } catch (err) {
    return res.status(500).json({ message: "Error resolving report" });
  } finally {
    connection.release();
  }
};

const deleteUser = async (req, res) => {
  const { userId } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.query("DELETE FROM Users WHERE id = ?", [userId]);
    return res.json({ message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Error deleting user" });
  } finally {
    connection.release();
  }
};
const deleteMatch = async (req, res) => {
  const { matchId } = req.params; // Lấy matchId từ tham số URL
  if (!matchId || isNaN(matchId)) {
    return res.status(400).json({ message: "Invalid match ID" });
  }

  const connection = await pool.getConnection();
  try {
    // Kiểm tra xem match có tồn tại không
    const [match] = await connection.query("SELECT * FROM Matches WHERE id = ?", [matchId]);
    if (match.length === 0) {
      return res.status(404).json({ message: "Match not found" });
    }

    // Xóa match
    await connection.query("DELETE FROM Matches WHERE id = ?", [matchId]);
    return res.json({ message: "Match deleted successfully" });
  } catch (err) {
    console.error("Error deleting match:", err);
    return res.status(500).json({ message: "Error deleting match" });
  } finally {
    connection.release();
  }
};

// Gửi thông báo cho người dùng

const sendNotification = async (req, res) => {
  const { userId, message } = req.body;
  const connection = await pool.getConnection();
  try {
    if (!userId || !message) {
      return res.status(400).json({ message: "User ID and Message are required" });
    }

    // Kiểm tra user tồn tại
    const [userRows] = await connection.query(
      "SELECT id FROM Users WHERE id = ?",
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Thêm thông báo vào bảng Notifications
    await connection.query(
      "INSERT INTO Notifications (user_id, content) VALUES (?, ?)",
      [userId, message]
    );

    return res.status(200).json({ message: "Notification sent successfully" });
  } catch (err) {
    console.error("Error sending notification:", err);
    return res.status(500).json({ message: "Error sending notification" });
  } finally {
    connection.release();
  }
};
const getUserProfile = async (req, res) => {
  const { userId } = req.params;
  const connection = await pool.getConnection();
  try {
    console.log(`Fetching profile for userId: ${userId}`);

    // Lấy thông tin từ bảng Users
    const [userRows] = await connection.query(
      "SELECT id, username, email, phone, gender, date_of_birth, is_verified, is_active, last_active FROM Users WHERE id = ?",
      [userId]
    );
    if (userRows.length === 0) {
      console.log(`User with ID ${userId} not found`);
      return res.status(404).json({ message: "User not found" });
    }
    const user = userRows[0];

    // Lấy thông tin từ bảng Profiles
    const [profileRows] = await connection.query(
      "SELECT bio, interests, location, city, height, occupation, education, relationship_status, looking_for FROM Profiles WHERE user_id = ?",
      [userId]
    );
    const profile = profileRows.length > 0 ? profileRows[0] : {};

    // Lấy ảnh chính từ bảng Photos (nếu có)
    const [photoRows] = await connection.query(
      "SELECT photo_url FROM Photos WHERE user_id = ? AND is_primary = 1 LIMIT 1",
      [userId]
    );
    const photo = photoRows.length > 0 ? photoRows[0].photo_url : null;

    // Kết hợp thông tin
    const userProfile = {
      ...user,
      ...profile,
      avatar: photo,
    };

    console.log("User profile fetched:", userProfile);
    return res.json(userProfile);
  } catch (err) {
    console.error("Error fetching user profile:", err.message); // Thêm log chi tiết
    return res.status(500).json({ message: "Error fetching user profile: " + err.message });
  } finally {
    connection.release();
  }
};

module.exports = {
 loginAdmin,
  verifyAdmin,
  getUsers,
  getReports,
  resolveReport,
  deleteUser,
  getMatches,
  deleteMatch,
  sendNotification,
  getUserProfile
};