const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./routes/authRouter");
const notificationRouter = require("./routes/notificationRouter");
const preferencesRoutes = require("./routes/preferencesRoutes");
const userRoutes = require("./routes/userRouter");
const reportRouter = require("./routes/reportRouter");
const matchRoutes = require("./routes/matchRouter");
const profileRoutes = require("./routes/profileRouter");
const chatRouter = require("./routes/chatRouter");
const adminRouter = require("./routes/adminRouter");
const errorMiddleware = require("./middleware/errorMiddleware");
const photoRoutes = require("./routes/photoRouter");
const pool = require("./config/db");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization"],
    credentials: true,
  },
  path: "/socket.io/",
});

app.use(helmet({
  contentSecurityPolicy: false // Tắt CSP tạm thời
}));
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("combined"));
app.use("/uploads", express.static("uploads"));
app.use("/api/photos", photoRoutes);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/chats", chatRouter);
app.use("/api/admin", adminRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/preferences", preferencesRoutes); 
app.use("/api/reports", reportRouter);

app.use(express.static("public"));

// xác thực người dùng
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId}`);

  if (socket.userId) {
    socket.join(socket.userId.toString());
    console.log(`User ${socket.userId} automatically joined room ${socket.userId}`);
  }
  socket.on("joinRoom", (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.userId} joined room ${chatId}`);
  });

  socket.on("messageRecalled", (data) => {
    console.log(`Client acknowledged message recall: ${data.messageId}`);
  });


  socket.on("sendMessage", async (messageData) => {
    try {
      const { chatId, text, timestamp } = messageData;
      if (!chatId || !text || !timestamp) {
        socket.emit("error", { message: "Invalid message data" });
        return;
      }

      const senderId = socket.userId;

      const connection = await pool.getConnection();
      try {
        const [match] = await connection.query(
          `
          SELECT * FROM Matches
          WHERE id = ? AND (user1_id = ? OR user2_id = ?)
          `,
          [chatId, senderId, senderId]
        );

        if (match.length === 0) {
          socket.emit("error", { message: "You do not have access to this chat" });
          return;
        }

        const [result] = await connection.query(
          `
          INSERT INTO Messages (match_id, sender_id, content, sent_at)
          VALUES (?, ?, ?, ?)
          `,
          [chatId, senderId, text, new Date(timestamp)]
        );

        const message = {
          id: result.insertId,
          chatId,
          senderId: senderId.toString(),
          text,
          timestamp,
        };

        io.to(chatId).emit("newMessage", message);
        console.log(`Message sent to room ${chatId}:`, message);
      } catch (err) {
        console.error("Error saving message:", err);
        socket.emit("error", { message: "Failed to send message" });
      } finally {
        connection.release();
      }
    } catch (err) {
      console.error("Error processing sendMessage:", err);
      socket.emit("error", { message: "Server error" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// sự kiện newMatch khi like được chấp nhận
app.use("/api/matches", (req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (req.method === "POST" && body.status === "accepted") {
      const user1Id = req.body.user1Id; 
      const user2Id = req.body.user2Id; 
      const match = {
        id: body.matchId || Date.now(), 
        userId: user2Id,
        name: "Tên người dùng",
        imgUrl: "https://via.placeholder.com/100", 
        hasMessages: false,
        isBlockedByOther: false,
      };

      // Phát sự kiện newMatch cho cả hai user
      io.to(user1Id.toString()).emit("newMatch", { userId: user1Id, match });
      io.to(user2Id.toString()).emit("newMatch", { userId: user2Id, match });
      console.log(`Emitted newMatch to ${user1Id} and ${user2Id}:`, match);
    }
    originalJson.call(this, body);
  };
  next();
});

app.get("/", (req, res) => {
  res.send("Dating App Backend is running 🚀");
});
app.get('/favicon.ico', (req, res) => res.status(204)); 

app.use((req, res, next) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use(errorMiddleware);

const serverStartTime = new Date().toISOString();
server.listen(process.env.PORT || 8888, '0.0.0.0', () => {
  console.log(`Server running on port ${process.env.PORT || 8888} at ${serverStartTime}`);
});