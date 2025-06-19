const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/dotenv");
const path = require("path");

const getChats = async (req, res, next) => {
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

    // Fetch matches with status = 'accepted' and exclude blocked matches, ordered by matched_at
    const [matches] = await connection.query(
      `
      SELECT 
        m.id AS match_id, 
        u.id AS user_id, 
        u.username, 
        u.date_of_birth, 
        p.city, 
        p.interests, 
        ph.photo_url,
        m.matched_at
      FROM Matches m
      JOIN Users u ON (m.user1_id = ? AND u.id = m.user2_id) OR (m.user2_id = ? AND u.id = m.user1_id)
      LEFT JOIN Profiles p ON u.id = p.user_id
      LEFT JOIN Photos ph ON u.id = ph.user_id AND ph.is_primary = 1
      WHERE m.status = 'accepted'
      AND NOT EXISTS (
        SELECT 1 
        FROM BlockedUsers b 
        WHERE (b.blocker_id = u.id AND b.blocked_id = ?) 
        OR (b.blocker_id = ? AND b.blocked_id = u.id)
      )
      ORDER BY m.matched_at DESC
      `,
      [userId, userId, userId, userId]
    );

    const host = req.get("host") || "192.168.0.100:8888";
    const formattedMatches = await Promise.all(
      matches.map(async (match) => {
        const dob = new Date(match.date_of_birth);
        if (isNaN(dob.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }

        // Check if there are messages for this match
        const [messages] = await connection.query(
          `
          SELECT COUNT(*) AS message_count
          FROM Messages
          WHERE match_id = ?
          `,
          [match.match_id]
        );

        const hasMessages = messages[0].message_count > 0;

        return {
          id: match.match_id.toString(),
          userId: match.user_id.toString(),
          name: match.username || "Unknown",
          age: age || 0,
          city: match.city || "Unknown City",
          imgUrl: match.photo_url
            ? `${req.protocol}://${host}/uploads/${path.basename(match.photo_url)}`
            : "https://via.placeholder.com/100",
          isOnline: false,
          lastMessage: null,
          timeSent: null,
          hasMessages,
          matchedAt: match.matched_at || null, // Thêm để debug
        };
      })
    ).then((results) => results.filter((match) => match !== null));

    // Split matches into two groups
    const matchesWithoutMessages = formattedMatches.filter((match) => !match.hasMessages);
    const chatsWithMessages = await Promise.all(
      formattedMatches
        .filter((match) => match.hasMessages)
        .map(async (match) => {
          const [lastMessage] = await connection.query(
            `
            SELECT content AS text, sent_at AS created_at
            FROM Messages
            WHERE match_id = ?
            ORDER BY sent_at DESC
            LIMIT 1
            `,
            [match.id]
          );

          return {
            ...match,
            lastMessage: lastMessage[0]?.text || "",
            timeSent: lastMessage[0]?.created_at || "",
          };
        })
    );

    // Sort chatsWithMessages by timeSent (newest first)
    chatsWithMessages.sort((a, b) => new Date(b.timeSent) - new Date(a.timeSent));

    await connection.commit();
    res.status(200).json({
      matchesWithoutMessages,
      chatsWithMessages,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error fetching chats for userId: ${req.userId || "unknown"} - ${error.message}`);
    res.status(500).json({ message: "Server error: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const getChatMessages = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const chatId = parseInt(req.params.chatId, 10);

    if (isNaN(chatId)) {
      return res.status(400).json({ message: "Invalid chat ID" });
    }

    connection = await pool.getConnection();

    // Kiểm tra xem user có quyền truy cập chat này không
    const [match] = await connection.query(
      `
      SELECT * FROM Matches
      WHERE id = ? AND (user1_id = ? OR user2_id = ?)
      `,
      [chatId, userId, userId]
    );

    if (match.length === 0) {
      return res.status(403).json({ message: "You do not have access to this chat" });
    }

    // Lấy tất cả tin nhắn của chat
    const [messages] = await connection.query(
      `
      SELECT m.id, m.sender_id, m.content AS text, m.sent_at AS timestamp
      FROM Messages m
      WHERE m.match_id = ?
      ORDER BY m.sent_at ASC
      `,
      [chatId]
    );

    // Định dạng tin nhắn
    const formattedMessages = messages.map((msg) => ({
      id: msg.id.toString(),
      chatId: chatId.toString(),
      sender: msg.sender_id.toString() === userId.toString() ? "me" : "other",
      text: msg.text,
      timestamp: msg.timestamp.toISOString(),
    }));

    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error(`Error fetching messages for chatId: ${req.params.chatId || "unknown"} - ${error.message}`);
    res.status(500).json({ message: "Server error: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const recallMessage = async (req, res, next) => {
  let connection;
  try {
    // 1. Xác thực token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    const userId = decoded.userId;

    // 2. Lấy messageId từ params
    const messageId = parseInt(req.params.messageId, 10);
    if (isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid messageId: Must be a number" });
    }

    // 3. Bắt đầu transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();
    console.log("Transaction started for recalling messageId:", messageId);

    // 4. Kiểm tra tin nhắn tồn tại và thuộc về người dùng
    const [message] = await connection.query(
      `
      SELECT * FROM Messages
      WHERE id = ? AND sender_id = ?
      `,
      [messageId, userId]
    );

    if (message.length === 0) {
      console.log("Message not found or not owned by user:", { messageId, userId });
      throw new Error("Message not found or you do not have permission to recall it");
    }

    const existingMessage = message[0];
    console.log("Found message:", existingMessage);

    if (existingMessage.is_read) {
      console.log("Message already read, cannot recall:", messageId);
      await connection.rollback();
      return res.status(400).json({ message: "Message already read, cannot be recalled" });
    }

    // 5. Kiểm tra và thêm cột updated_at nếu chưa có
    const [columns] = await connection.query(
      `
      SHOW COLUMNS FROM Messages LIKE 'updated_at'
      `
    );
    if (columns.length === 0) {
      await connection.query(
        `
        ALTER TABLE Messages
        ADD COLUMN updated_at DATETIME DEFAULT NULL
        `
      );
      console.log("Added updated_at column to Messages table");
    }

    // 6. Cập nhật trạng thái recalled
    const [updateResult] = await connection.query(
      `
      UPDATE Messages
      SET content = 'Message recalled', updated_at = NOW()
      WHERE id = ?
      `,
      [messageId]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error("Failed to update message");
    }

    // 7. Lấy matchId để phát sự kiện
    const chatId = existingMessage.match_id.toString();
    console.log("Retrieved chatId for emission:", chatId);

    // 8. Phát sự kiện Socket.IO
    if (req.io && typeof req.io.to === "function") {
      req.io.to(chatId).emit("messageRecalled", {
        messageId: messageId.toString(),
        chatId,
        timestamp: new Date().toISOString(),
      });
      console.log(`Emitted messageRecalled for chatId: ${chatId}, messageId: ${messageId}`);
    } else {
      console.warn("Socket.IO not available or req.io is undefined. Skipping emit for messageRecalled.");
    }

    // 9. Commit transaction
    await connection.commit();
    console.log("Transaction committed successfully for recalling messageId:", messageId);
    res.status(200).json({ message: "Message recalled successfully" });

  } catch (error) {
    if (connection) {
      console.log("Rolling back transaction due to error:", error.message);
      await connection.rollback();
    }
    console.error(`Error in recallMessage for messageId: ${req.params.messageId} -`, {
      message: error.message,
      stack: error.stack,
    });
    return res
      .status(error.message.includes("not found") ? 404 : 500)
      .json({
        message: error.message.includes("not found")
          ? "Message not found"
          : `Server error: ${error.message || "Unknown error"}`,
      });
  } finally {
    if (connection) {
      connection.release();
      console.log("Database connection released");
    }
  }
};


module.exports = { getChats, getChatMessages, recallMessage };
