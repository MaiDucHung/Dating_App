const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/dotenv");

const register = async (req, res, next) => {
  let connection;
  try {
    const { username, email, password, date_of_birth, gender } = req.body;

    console.log("Received registration data:", { username, email, password, date_of_birth, gender });

    if (!username || !email || !password || !date_of_birth || !gender) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    const emailRegex = /^[^\s@]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email must be in @gmail.com format" });
    }

    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(date_of_birth)) {
      return res.status(400).json({ message: "Date of birth must be in YYYY-MM-DD format" });
    }

    const validGenders = ["male", "female", "other", "prefer_not_say"];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ message: "Invalid gender value" });
    }

    connection = await pool.getConnection();
    const [existingUser] = await connection.query(
      "SELECT * FROM Users WHERE email = ? ",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Email or username already exists" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await connection.query(
      "INSERT INTO Users (username, email, password, date_of_birth, gender, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [username, email, hashedPassword, date_of_birth, gender]
    );

    console.log(`User registered successfully: ${email} at ${new Date().toISOString()}`);
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error(`Error registering user: ${error.message}`);
    next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const login = async (req, res, next) => {
  let connection;
  try {
    const { email, password } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Lấy kết nối từ pool
    connection = await pool.getConnection();
    console.log("Database connection established");

    // Truy vấn người dùng
    const [users] = await connection.query("SELECT * FROM Users WHERE email = ?", [email]);
    console.log("Users query result:", users);

    if (users.length === 0) {
      console.log("User not found for email:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];

    // So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log("Password comparison result:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("Invalid password for user:", user.id);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Tạo JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    console.log("Generated token:", token);

    // Kiểm tra bản ghi trong bảng Profiles
    const [profiles] = await connection.query(
      "SELECT user_id FROM Profiles WHERE user_id = ?",
      [user.id]
    );
    console.log(`Profiles query result for user ${user.id}:`, profiles);

    const hasProfile = profiles.length > 0;
    console.log(`User ${user.id} - hasProfile: ${hasProfile}`);

    // Logic xác định needsProfileSetup
    const needsProfileSetup = !hasProfile;
    console.log(`User ${user.id} - needsProfileSetup: ${needsProfileSetup}`);

    // Chuẩn bị phản hồi
    const responseData = { token, needsProfileSetup };
    console.log("Response data:", responseData);

    // Gửi phản hồi
    res.status(200).json(responseData);
  } catch (error) {
    console.error(`Error logging in user: ${error.message}`);
    next(error);
  } finally {
    if (connection) {
      connection.release();
      console.log("Database connection released");
    }
  }
};
module.exports = { register, login };
