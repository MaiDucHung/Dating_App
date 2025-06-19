const jwt = require("jsonwebtoken");
const pool = require("../config/db"); 
const JWT_SECRET = process.env.JWT_SECRET; 


const getNotifications = async (req, res, next) => {
  let connection;

  try {
    // Lấy và kiểm tra token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No valid token provided in getNotifications");
      return res.status(401).json({ message: "No token provided or invalid format" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token received in getNotifications:", token);

    // Xác minh token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log("Decoded token payload:", decoded);
    } catch (error) {
      console.error("JWT verification failed:", error.message);
      return res.status(401).json({ message: "Invalid or expired token", error: error.message });
    }

    const userId = decoded.userId;
    if (!userId || isNaN(parseInt(userId))) {
      console.error("Invalid userId from token:", userId);
      return res.status(400).json({ message: "Invalid user ID in token" });
    }

    // Lấy kết nối từ pool
    connection = await pool.getConnection();
    console.log("Database connection established for user:", userId);

    // Truy vấn danh sách thông báo
    const [notifications] = await connection.query(
      `SELECT id, type, content, is_read, created_at 
       FROM Notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    console.log(`Fetched ${notifications.length} notifications for user ${userId}:`, notifications);

    // Trả về danh sách thông báo
    return res.status(200).json(notifications);
  } catch (error) {
    console.error(`Error in getNotifications for userId: ${userId || "unknown"} - ${error.message}`);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    // Giải phóng kết nối
    if (connection) {
      connection.release();
      console.log("Database connection released");
    }
  }
};

const clearReadNotifications = async (req, res, next) => {
  let connection;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No valid token provided in clearReadNotifications");
      return res.status(401).json({ message: "No token provided or invalid format" });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token received in clearReadNotifications:", token);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log("Decoded token payload:", decoded);
    } catch (error) {
      console.error("JWT verification failed:", error.message);
      return res.status(401).json({ message: "Invalid or expired token", error: error.message });
    }

    const userId = decoded.userId;
    if (!userId || isNaN(parseInt(userId))) {
      console.error("Invalid userId from token:", userId);
      return res.status(400).json({ message: "Invalid user ID in token" });
    }

    connection = await pool.getConnection();
    console.log("Database connection established for user:", userId);

    // Xóa các thông báo đã đọc
    const [result] = await connection.query(
      `DELETE FROM Notifications 
       WHERE user_id = ? AND is_read = ?`,
      [userId, 1]
    );

    console.log(`Deleted ${result.affectedRows} read notifications for user ${userId}`);

    return res.status(200).json({ message: "Read notifications cleared successfully", affectedRows: result.affectedRows });
  } catch (error) {
    console.error(`Error in clearReadNotifications for userId: ${userId || "unknown"} - ${error.message}`);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) {
      connection.release();
      console.log("Database connection released");
    }
  }
};

const notifyLike = async (req, res, next) => {
  let connection;
  try {
    console.log("Request body in notifyLike:", req.body);

    // Validate input
    const { user2Id, message } = req.body;
    if (!user2Id || !message) {
      console.log("Thiếu user2Id hoặc message:", req.body);
      return res.status(400).json({ message: "Thiếu user2Id hoặc message" });
    }
    if (!Number.isInteger(Number(user2Id))) {
      console.log("user2Id không hợp lệ:", user2Id);
      return res.status(400).json({ message: "user2Id không hợp lệ" });
    }
    if (typeof message !== "string" || message.length > 255) {
      console.log("Message không hợp lệ hoặc quá dài:", message);
      return res.status(400).json({ message: "Message phải là chuỗi và dưới 255 ký tự" });
    }

    console.log("Đang gửi thông báo cho user2Id:", user2Id, "với message:", message);

    connection = await pool.getConnection();

    // Kiểm tra user2Id có tồn tại
    const [userCheck] = await connection.query(`SELECT id FROM Users WHERE id = ?`, [user2Id]);
    if (!userCheck.length) {
      console.log(`User với id ${user2Id} không tồn tại`);
      return res.status(400).json({ message: `User với id ${user2Id} không tồn tại` });
    }

    // Lưu thông báo vào Notifications
    const [insertResult] = await connection.query(
      `INSERT INTO Notifications (user_id, type, content, created_at) 
       VALUES (?, 'match', ?, NOW())`,
      [user2Id, message]
    );
    console.log("Kết quả insert Notifications:", insertResult);

    // Emit thông báo qua Socket.IO
    if (req.io && typeof req.io.to === "function") {
      req.io.to(user2Id.toString()).emit("newLike", {
        userId: user2Id.toString(),
        message: message,
        timestamp: new Date().toISOString(),
      });
      console.log(`Đã emit newLike tới user: ${user2Id}`);
    } else {
      console.warn("Socket.IO không khả dụng. Bỏ qua emit.");
    }

    res.status(200).json({ message: "Gửi thông báo thành công" });
  } catch (error) {
    console.error(`Lỗi khi gửi thông báo cho user2Id: ${user2Id || "unknown"} - ${error.message}`, error.stack);
    res.status(500).json({ message: "Lỗi server nội bộ" });
  } finally {
    if (connection) connection.release();
  }
};


module.exports = {
  getNotifications,
  clearReadNotifications,
  notifyLike,
};