const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET = "default-secret" } = require("../config/dotenv");
const multer = require("multer");
const path = require("path");
const { io } = require("../server");
// Configure multer for file upload with validation
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, `profile_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, jpg, png) are allowed!"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
});
const updateUserProfile = async (req, res, next) => {
  let conn;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });
    const { userId } = jwt.verify(token, JWT_SECRET);
    const { name, age, bio, hobbies, height, occupation, education, looking_for } = req.body;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Update Users
    const dob = age ? new Date(new Date().setFullYear(new Date().getFullYear() - age)) : null;
    await conn.query(
      `UPDATE Users SET username = ?, date_of_birth = ? WHERE id = ?`,
      [name, dob, userId]
    );
    // Update Profiles
    await conn.query(
      `UPDATE Profiles SET bio = ?, interests = ?, height = ?, occupation = ?, education = ?, looking_for = ? WHERE user_id = ?`,
      [bio||null, hobbies? hobbies.join(", "): null, height||0, occupation||null, education||null, looking_for||null, userId]
    );
    await conn.commit();
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    next(err);
  } finally {
    if (conn) conn.release();
  }
};

const deletePhoto = async (req, res, next) => {
  let conn;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });
    const { userId } = jwt.verify(token, JWT_SECRET);
    const photoId = parseInt(req.params.id, 10);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Verify ownership
    const [rows] = await conn.query(
      `SELECT photo_url FROM Photos WHERE id = ? AND user_id = ?`,
      [photoId, userId]
    );
    if (!rows.length) {
      return res.status(403).json({ message: "Cannot delete this photo" });
    }
    const filePath = path.join(__dirname, "../uploads", path.basename(rows[0].photo_url));

    // Delete DB record and file
    await conn.query(`DELETE FROM Photos WHERE id = ?`, [photoId]);
    fs.unlink(filePath, err => err && console.warn("File delete error:", err));

    await conn.commit();
    res.json({ message: "Photo deleted successfully" });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error(err);
    next(err);
  } finally {
    if (conn) conn.release();
  }
};

const updateProfile = async (req, res, next) => {
  let connection;
  try {
    const {
      bio,
      interests,
      location,
      city,
      height,
      occupation,
      education,
      relationship_status,
      looking_for,
    } = req.body;

    if ( !city || !height || !relationship_status || !looking_for) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    if (bio && (typeof bio !== "string" || bio.length > 500)) {
      return res.status(400).json({ message: "Bio must be a string and not exceed 500 characters" });
    }
    if (interests && (typeof interests !== "string" || interests.length > 255)) {
      return res.status(400).json({ message: "Interests must be a string and not exceed 255 characters" });
    }
    // if (typeof location !== "string" || location.length > 255) {
    //   return res.status(400).json({ message: "Location must be a string and not exceed 255 characters" });
    // }
    if (typeof city !== "string" || city.length > 100) {
      return res.status(400).json({ message: "City must be a string and not exceed 100 characters" });
    }
    if (isNaN(height) || height < 80 || height > 200) {
      return res.status(400).json({ message: "Height must be a number between 80cm and 200cm" });
    }
    if (occupation && (typeof occupation !== "string" || occupation.length > 100)) {
      return res.status(400).json({ message: "Occupation must be a string and not exceed 100 characters" });
    }
    if (education && (typeof education !== "string" || education.length > 100)) {
      return res.status(400).json({ message: "Education must be a string and not exceed 100 characters" });
    }

    const validRelationshipStatuses = ["single", "married", "divorced", "widowed", "complicated"];
    if (!validRelationshipStatuses.includes(relationship_status)) {
      return res.status(400).json({ message: "Invalid relationship status" });
    }

    const validLookingFor = ["friendship", "dating", "serious"];
    if (!validLookingFor.includes(looking_for)) {
      return res.status(400).json({ message: "Invalid looking for value" });
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingProfile] = await connection.query(
      "SELECT user_id FROM Profiles WHERE user_id = ?",
      [userId]
    );

    if (existingProfile.length > 0) {
      await connection.query(
        `
        UPDATE Profiles
        SET bio = ?, interests = ?, location = ?, city = ?, height = ?, 
            occupation = ?, education = ?, relationship_status = ?, looking_for = ?, updated_at = NOW()
        WHERE user_id = ?;
        `,
        [
          bio || null,
          interests || null,
          location,
          city,
          height,
          occupation || null,
          education || null,
          relationship_status,
          looking_for,
          userId,
        ]
      );
    } else {
      await connection.query(
        `
        INSERT INTO Profiles (user_id, bio, interests, location, city, height, occupation, education, relationship_status, looking_for, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW());
        `,
        [
          userId,
          bio || null,
          interests || null,
          location,
          city,
          height,
          occupation || null,
          education || null,
          relationship_status,
          looking_for,
        ]
      );
    }

    await connection.commit();
    console.log(`Profile updated successfully for userId: ${userId} at ${new Date().toISOString()}`);
    res.status(200).json({ message: "Profile updated successfully", userId });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error updating profile for userId: ${req.userId || 'unknown'} - ${error.message}`);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

const notifyLike = async (req, res, next) => {
  let connection;
  try {
    console.log("Request body in notifyLike:", req.body); // Log để kiểm tra

    // Gán biến từ req.body và kiểm tra
    const requestData = req.body;
    if (!requestData || !requestData.user2Id || !requestData.message) {
      console.log("Missing user2Id or message in notifyLike request:", requestData);
      return res.status(400).json({ message: "Missing user2Id or message" });
    }

    const user2Id = requestData.user2Id; // Gán rõ ràng
    const message = requestData.message;  // Gán rõ ràng
    console.log("Attempting to notify user2Id:", user2Id, "with message:", message);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Kiểm tra user2Id có tồn tại trong bảng Users không
    const [userCheck] = await connection.query(
      `SELECT id FROM Users WHERE id = ?`,
      [user2Id]
    );
    if (!userCheck.length) {
      console.log(`User with id ${user2Id} does not exist in Users table`);
      return res.status(400).json({ message: `User with id ${user2Id} does not exist` });
    }

    // Lưu thông báo vào bảng Notifications
    const [insertResult] = await connection.query(
      `INSERT INTO Notifications (user_id, type, content, created_at) 
       VALUES (?, 'match', ?, NOW())`,
      [user2Id, message]
    );
    console.log("Insert result for Notifications:", insertResult);

    await connection.commit();

    // Emit thông báo qua Socket.IO
    if (io && typeof io.emit === "function") {
      io.emit("newLike", {
        userId: user2Id.toString(),
        message: message,
        timestamp: new Date().toISOString(),
      });
      console.log("Emitted newLike for user:", user2Id);
    } else {
      console.warn("Socket.IO is not available. Skipping emit.");
    }

    res.status(200).json({ message: "Notification sent successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error notifying like for user2Id: ${user2Id || "unknown"} - ${error.message}`);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const getProfile = async (req, res, next) => {
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

    // Truy vấn lấy thông tin profile và tất cả ảnh
    const [userProfile] = await connection.query(
      `
      SELECT 
        u.id, 
        u.username, 
        u.date_of_birth, 
        p.city, 
        p.bio, 
        p.interests, 
        p.height, 
        p.occupation, 
        p.education, 
        p.looking_for
      FROM Users u
      LEFT JOIN Profiles p ON u.id = p.user_id
      WHERE u.id = ?
      `,
      [userId]
    );

    if (userProfile.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Lấy tất cả ảnh, sắp xếp để is_primary = 1 lên đầu
    const [photos] = await connection.query(
      `
      SELECT 
        id, 
        photo_url AS imgUrl, 
        is_primary
      FROM Photos 
      WHERE user_id = ? 
      ORDER BY is_primary DESC, uploaded_at DESC
      `,
      [userId]
    );

    const profile = userProfile[0];
    const dob = new Date(profile.date_of_birth);
    let age = 0;
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
    }

    const host = req.get("host") || "192.168.0.100:8888";
    const formattedProfile = {
      id: profile.id.toString(),
      name: profile.username,
      age: age,
      city: profile.city || "Unknown City",
      bio: profile.bio || "",
      hobbies: profile.interests ? profile.interests.split(",") : [],
      height: profile.height || 0,
      occupation: profile.occupation || "Not specified",
      education: profile.education || "Not specified",
      looking_for: profile.looking_for || "Not specified",
      imgUrl: photos.length > 0 ? `${req.protocol}://${host}${photos[0].imgUrl}` : null,
      photos: photos.map((photo) => ({
        id: photo.id.toString(),
        imgUrl: `${req.protocol}://${host}${photo.imgUrl}`,
        is_primary: photo.is_primary,
      })),
    };

    await connection.commit();
    res.status(200).json(formattedProfile);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error fetching profile for userId: ${req.userId || "unknown"} - ${error.message}, Stack: ${error.stack}`);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

const discoverProfiles = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    let decoded;
    try {
      console.log("JWT_SECRET used in discoverProfiles:", JWT_SECRET);
      decoded = jwt.verify(token, JWT_SECRET);
      console.log("Decoded token payload:", decoded);
    } catch (error) {
      console.error("JWT verification error in discoverProfiles:", error.message);
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }

    const userId = decoded.userId;
    if (!userId || isNaN(parseInt(userId))) {
      console.error("Invalid userId from token in discoverProfiles:", userId);
      return res.status(401).json({ message: "Invalid user ID in token" });
    }

    console.log("Decoded userId in discoverProfiles:", userId);

    const limit = parseInt(req.query.limit) || 10;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lấy gender của người dùng hiện tại
    const [user] = await connection.query(
      "SELECT gender FROM Users WHERE id = ?",
      [userId]
    );
    const myGender = user.length > 0 ? user[0].gender : "prefer_not_say";
    console.log("My gender:", myGender); // Debug

    // Xây dựng điều kiện để lấy giới tính ngược lại
    let genderCondition = "";
    if (myGender === "male") {
      genderCondition = "u.gender = 'female'";
    } else if (myGender === "female") {
      genderCondition = "u.gender = 'male'";
    } else {
      genderCondition = "u.gender IN ('male', 'female')"; // Nếu khác male/female, lấy cả hai
    }

    const [profiles] = await connection.query(
  `
  SELECT u.id, u.username, u.date_of_birth, u.gender, p.city, p.bio, p.interests, p.height, p.relationship_status, p.looking_for
  FROM Users u
  LEFT JOIN Profiles p ON u.id = p.user_id
  WHERE u.id != ? 
    AND u.is_active = 1
    AND u.id NOT IN (
      SELECT user2_id FROM Matches WHERE user1_id = ? AND status IN ('accepted', 'pending', 'dislike1')
      UNION
      SELECT user1_id FROM Matches WHERE user2_id = ? AND status IN ('accepted', 'pending', 'dislike1')
    )
    AND u.id NOT IN (
      SELECT blocked_id FROM BlockedUsers WHERE blocker_id = ?
    )
    AND EXISTS (
      SELECT 1 FROM Photos ph WHERE ph.user_id = u.id
    ) -- Chỉ lấy user có ảnh
    AND (${genderCondition})
  LIMIT ?
  `,
  [userId, userId, userId, userId, limit]
);

    console.log("Profiles fetched from DB:", profiles);

    const host = req.get("host") || "192.168.0.100:8888";
    const formattedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        const dob = new Date(profile.date_of_birth);
        if (isNaN(dob.getTime())) {
          console.warn(`Invalid date of birth for user ${profile.id}`);
          return null;
        }
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }

        // Lấy tất cả ảnh cho user này và sắp xếp theo is_primary
        const [photos] = await connection.query(
          "SELECT photo_url, is_primary FROM Photos WHERE user_id = ? ORDER BY is_primary DESC",
          [profile.id]
        );

        return {
          id: profile.id.toString(),
          username: profile.username || "Unknown",
          age: age || 0,
          gender: profile.gender || "Not specified",
          city: profile.city || "Unknown City",
          bio: profile.bio || "",
          hobbies: profile.interests ? profile.interests.split(",") : [],
          height: profile.height || null,
          relationship_status: profile.relationship_status || "Not specified",
          looking_for: profile.looking_for || "Not specified",
          photos: photos.map((photo) => ({
            imgUrl: `${req.protocol}://${host}${photo.photo_url}`,
            is_primary: photo.is_primary === 1,
          })),
        };
      })
    ).then((results) => results.filter((profile) => profile !== null));

    await connection.commit();
    res.status(200).json(formattedProfiles);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error fetching profiles for userId: ${req.userId || "unknown"} - ${error.message}`);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

const getMatchedProfiles = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const limit = parseInt(req.query.limit) || 10;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [matchedUsers] = await connection.query(
      `
      SELECT u.id AS user_id, u.username, u.date_of_birth, p.city, p.bio, p.interests
      FROM Users u
      LEFT JOIN Profiles p ON u.id = p.user_id
      JOIN Matches m ON (m.user1_id = u.id AND m.user2_id = ?) OR (m.user1_id = ? AND m.user2_id = u.id)
      WHERE m.status = 'accepted' AND m.user1_swiped = 1 AND m.user2_swiped = 1
      LIMIT ?
      `,
      [userId, userId, limit]
    );

    const profiles = await Promise.all(
      matchedUsers.map(async (user) => {
        const dob = new Date(user.date_of_birth);
        if (isNaN(dob.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }

        const [photos] = await connection.query(
          "SELECT photo_url FROM Photos WHERE user_id = ? AND photo_url IS NOT NULL ORDER BY is_primary DESC, uploaded_at DESC",
          [user.user_id]
        );

        return {
          id: user.user_id.toString(),
          username: user.username || "Unknown",
          age: age || 0,
          city: user.city || "Unknown City",
          bio: user.bio || "",
          hobbies: user.interests ? user.interests.split(",") : [],
          photos: photos.map(photo => ({
            imgUrl: photo.photo_url ? `${req.protocol}://${req.get("host") || "localhost:8888"}${photo.photo_url}` : null,
          })),
        };
      })
    ).then(results => results.filter(profile => profile !== null));

    await connection.commit();
    res.status(200).json(profiles);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error fetching matched profiles for userId: ${req.userId || 'unknown'} - ${error.message}`);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

const getPendingLikes = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    let decoded;
    try {
      console.log("JWT_SECRET used in getPendingLikes:", JWT_SECRET);
      decoded = jwt.verify(token, JWT_SECRET);
      console.log("Decoded token payload in getPendingLikes:", decoded);
    } catch (error) {
      console.error("JWT verification error in getPendingLikes:", error.message);
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }

    const userId = decoded.userId;
    if (!userId || isNaN(parseInt(userId))) {
      console.error("Invalid userId from token in getPendingLikes:", userId);
      return res.status(401).json({ message: "Invalid user ID in token" });
    }

    console.log("Decoded userId in getPendingLikes:", userId);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Fetch pending likes, ordered by swiped_at DESC (newest to oldest)
    const [likes] = await connection.query(
      `
      SELECT DISTINCT u.id, u.username, u.date_of_birth, p.city, p.bio, p.interests, ph.photo_url, m.swiped_at
      FROM Matches m
      JOIN Users u ON m.user1_id = u.id
      LEFT JOIN Profiles p ON u.id = p.user_id
      LEFT JOIN Photos ph ON u.id = ph.user_id AND ph.is_primary = 1
      WHERE m.user2_id = ? AND m.status = 'pending' AND m.user1_swiped = 1 AND m.user2_swiped = 0
      ORDER BY m.swiped_at DESC
      `,
      [userId]
    );

    const host = req.get("host") || "192.168.0.100:8888";
    const formattedLikes = await Promise.all(
      likes.map(async (profile) => {
        const dob = new Date(profile.date_of_birth);
        if (isNaN(dob.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }

        return {
          id: profile.id.toString(),
          username: profile.username || "Unknown",
          age: age || 0,
          city: profile.city || "Unknown City",
          bio: profile.bio || "",
          hobbies: profile.interests ? profile.interests.split(",") : [],
          photos: profile.photo_url ? [{ imgUrl: `${req.protocol}://${host}${profile.photo_url}` }] : [],
        };
      })
    ).then((results) => results.filter((profile) => profile !== null));

    await connection.commit();
    res.status(200).json(formattedLikes);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error fetching pending likes for userId: ${req.userId || "unknown"} - ${error.message}`);
    res.status(500).json({ message: "Server error: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const getDislikedProfiles = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const limit = parseInt(req.query.limit) || 10;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [dislikedUsers] = await connection.query(
      `
      SELECT u.id AS user_id, u.username, u.date_of_birth, p.city, p.bio, p.interests
      FROM Users u
      LEFT JOIN Profiles p ON u.id = p.user_id
      JOIN Matches m ON m.user2_id = u.id
      WHERE m.user1_id = ? AND m.status = 'dislike1'
      LIMIT ?
      `,
      [userId, limit]
    );

    const profiles = await Promise.all(
      dislikedUsers.map(async (user) => {
        const dob = new Date(user.date_of_birth);
        if (isNaN(dob.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }

        const [photos] = await connection.query(
          "SELECT photo_url FROM Photos WHERE user_id = ? AND photo_url IS NOT NULL ORDER BY is_primary DESC, uploaded_at DESC",
          [user.user_id]
        );

        return {
          id: user.user_id.toString(),
          username: user.username || "Unknown",
          age: age || 0,
          city: user.city || "Unknown City",
          bio: user.bio || "",
          hobbies: user.interests ? user.interests.split(",") : [],
          photos: photos.map(photo => ({
            imgUrl: photo.photo_url ? `${req.protocol}://${req.get("host") || "localhost:8888"}${photo.photo_url}` : null,
          })),
        };
      })
    ).then(results => results.filter(profile => profile !== null));

    await connection.commit();
    res.status(200).json(profiles);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error fetching disliked profiles for userId: ${req.userId || 'unknown'} - ${error.message}`);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

const sendMatchData = async (req, res, next) => {
  let connection;
  let userId;
  try {
    // 1. Xác thực token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.log("No token provided in sendMatchData");
      return res.status(401).json({ message: "No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    userId = decoded.userId;

    // 2. Kiểm tra dữ liệu đầu vào
    const { user2Id, status } = req.body;
    if (!user2Id || !status) {
      console.log("Missing required fields in sendMatchData:", { user2Id, status });
      return res.status(400).json({ message: "Missing user2Id or status" });
    }

    const parsedUser2Id = parseInt(user2Id, 10);
    if (isNaN(parsedUser2Id)) {
      console.log("Invalid user2Id in sendMatchData:", user2Id);
      return res.status(400).json({ message: "Invalid user2Id: Must be a number" });
    }

    if (userId === parsedUser2Id) {
      console.log("User attempted to match with themselves:", userId);
      return res.status(400).json({ message: "Cannot match with yourself" });
    }

    // Kiểm tra trạng thái hợp lệ
    if (!["pending", "dislike1"].includes(status)) {
      console.log("Invalid status in sendMatchData:", status);
      return res.status(400).json({ message: "Invalid status: Must be 'pending' or 'dislike1'" });
    }

    // 3. Bắt đầu transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();
    console.log("Transaction started for user1Id:", userId, "user2Id:", parsedUser2Id);

    // 4. Kiểm tra user2 tồn tại
    const [user2] = await connection.query("SELECT id FROM Users WHERE id = ?", [parsedUser2Id]);
    if (user2.length === 0) {
      console.log("User not found in sendMatchData:", parsedUser2Id);
      throw new Error("User not found");
    }

    // 5. Tìm match hiện tại (cả hai hướng)
    const [directMatchRows] = await connection.query(
      `SELECT * FROM Matches WHERE user1_id = ? AND user2_id = ?`,
      [userId, parsedUser2Id]
    );
    const [reverseMatchRows] = await connection.query(
      `SELECT * FROM Matches WHERE user1_id = ? AND user2_id = ?`,
      [parsedUser2Id, userId]
    );

    let matchId = null;
    let isReverse = false;
    let user1Swiped = 0; // Cờ swipe của user1 trong DB
    let user2Swiped = 0; // Cờ swipe của user2 trong DB
    let matchStatus = status; // Trạng thái ban đầu

    // 6. Xử lý logic match
    if (reverseMatchRows.length > 0) {
      // Match ngược (B -> A): B là user1, A là user2 trong DB
      isReverse = true;
      matchId = reverseMatchRows[0].id;
      user1Swiped = reverseMatchRows[0].user1_swiped; // B đã swipe A
      user2Swiped = status === "pending" ? 1 : 0; // A swipe B (hiện tại)

      console.log("Reverse match found:", reverseMatchRows[0]);

      // Nếu match đã accepted, không cho phép thay đổi
      if (reverseMatchRows[0].status === "accepted") {
        console.log("Match already accepted for matchId (reverse):", matchId);
        await connection.rollback();
        return res.status(200).json({ status: "accepted", message: "Match already accepted" });
      }

      // Cập nhật trạng thái match
      if (reverseMatchRows[0].status === "pending" && status === "pending") {
        matchStatus = "accepted"; // Cả hai đều thích
      } else if (status === "dislike1" || reverseMatchRows[0].status === "dislike1") {
        matchStatus = "dislike1"; // Một trong hai không thích
      }

    } else if (directMatchRows.length > 0) {
      // Match trực tiếp (A -> B): A là user1, B là user2 trong DB
      matchId = directMatchRows[0].id;
      user1Swiped = status === "pending" ? 1 : 0; // A swipe B (hiện tại)
      user2Swiped = directMatchRows[0].user2_swiped; // B đã swipe A (nếu có)

      console.log("Direct match found:", directMatchRows[0]);

      // Nếu match đã accepted, không cho phép thay đổi
      if (directMatchRows[0].status === "accepted") {
        console.log("Match already accepted for matchId (direct):", matchId);
        await connection.rollback();
        return res.status(200).json({ status: "accepted", message: "Match already accepted" });
      }

      // Cập nhật trạng thái match (đã xử lý trường hợp reverse ở trên)
      if (status === "dislike1" || directMatchRows[0].status === "dislike1") {
        matchStatus = "dislike1";
      }

    } else {
      // Chưa có match, tạo mới (A -> B)
      const [result] = await connection.query(
        `INSERT INTO Matches 
          (user1_id, user2_id, user1_swiped, user2_swiped, status, swiped_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [userId, parsedUser2Id, status === "pending" ? 1 : 0, 0, status]
      );
      matchId = result.insertId;
      user1Swiped = status === "pending" ? 1 : 0;
      user2Swiped = 0;
      console.log("New match created with matchId:", matchId);
    }

    // 7. Cập nhật match trong DB
    if (directMatchRows.length > 0 || reverseMatchRows.length > 0) {
      console.log("Updating match:", { matchId, isReverse, user1Swiped, user2Swiped, matchStatus });
      await connection.query(
        `UPDATE Matches
         SET user1_swiped = ?, user2_swiped = ?, status = ?, swiped_at = NOW(), matched_at = ?
         WHERE id = ?`,
        [user1Swiped, user2Swiped, matchStatus, matchStatus === "accepted" ? new Date() : null, matchId]
      );
    }

    // 8. Gửi sự kiện Socket.IO nếu có
    if (matchStatus === "pending" && req.io && typeof req.io.to === "function") {
      const notifyId = isReverse ? userId : parsedUser2Id; // Người nhận thông báo "like"
      req.io.to(notifyId.toString()).emit("newLike", {
        userId: notifyId.toString(),
        message: "Đã có người thích bạn",
        timestamp: new Date().toISOString(),
      });
      console.log("Emitted newLike for user:", notifyId);
    }

    // 9. Gửi newMatch/newConnection khi matchStatus === "accepted"
    if (matchStatus === "accepted" && req.io && typeof req.io.to === "function") {
      const user1Id = isReverse ? parsedUser2Id : userId; // user1 trong DB
      const user2Id = isReverse ? userId : parsedUser2Id; // user2 trong DB

      // Lấy thông tin chi tiết của cả hai người dùng
      const [user1Data] = await connection.query(
        `SELECT u.id, u.username, u.date_of_birth, p.city, p.interests, ph.photo_url
         FROM Users u
         LEFT JOIN Profiles p ON u.id = p.user_id
         LEFT JOIN Photos ph ON u.id = ph.user_id AND ph.is_primary = 1
         WHERE u.id = ?`,
        [user1Id]
      );
      const [user2Data] = await connection.query(
        `SELECT u.id, u.username, u.date_of_birth, p.city, p.interests, ph.photo_url
         FROM Users u
         LEFT JOIN Profiles p ON u.id = p.user_id
         LEFT JOIN Photos ph ON u.id = ph.user_id AND ph.is_primary = 1
         WHERE u.id = ?`,
        [user2Id]
      );

      if (!user1Data[0] || !user2Data[0]) {
        throw new Error("Failed to fetch matched user data");
      }

      // Hàm tính tuổi
      const calculateAge = (dob) => {
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return 0;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const mDiff = today.getMonth() - birthDate.getMonth();
        if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const host = req.get("host") || "192.168.0.100:8888";
      const createMatchObject = (userData, otherUserId) => ({
        id: matchId.toString(),
        userId: otherUserId.toString(),
        name: userData.username || "Unknown",
        age: calculateAge(userData.date_of_birth),
        city: userData.city || "Unknown City",
        imgUrl: userData.photo_url
          ? `${req.protocol}://${host}${userData.photo_url}`
          : "https://via.placeholder.com/100",
        isOnline: false,
        lastMessage: null,
        timeSent: null,
        hasMessages: false,
      });

      // Tạo đối tượng newMatch cho từng người dùng
      const matchForUser1 = createMatchObject(user2Data[0], user2Id); // Gửi cho user1 thông tin của user2
      const matchForUser2 = createMatchObject(user1Data[0], user1Id); // Gửi cho user2 thông tin của user1

      // Gửi sự kiện newMatch đến phòng cụ thể
      req.io.to(user1Id.toString()).emit("newMatch", { userId: user1Id.toString(), match: matchForUser1 });
      req.io.to(user2Id.toString()).emit("newMatch", { userId: user2Id.toString(), match: matchForUser2 });

      // Gửi sự kiện newConnection
      req.io.to(user1Id.toString()).emit("newConnection", {
        userId: user1Id.toString(),
        message: "Đã có 1 kết nối mới",
        timestamp: new Date().toISOString(),
      });
      req.io.to(user2Id.toString()).emit("newConnection", {
        userId: user2Id.toString(),
        message: "Đã có 1 kết nối mới",
        timestamp: new Date().toISOString(),
      });

      console.log("Emitted newMatch/newConnection for users:", user1Id, user2Id);
    } else if (matchStatus === "accepted") {
      console.warn("Socket.IO is not available or to function is missing. Skipping emit for newMatch/newConnection.");
    }

    // 10. Commit và trả kết quả
    await connection.commit();
    console.log("Transaction committed successfully for matchId:", matchId);
    return res.status(200).json({ status: matchStatus });

  } catch (error) {
    if (connection) {
      console.log("Rolling back transaction due to error:", error.message);
      await connection.rollback();
    }
    console.error(
      `Error in sendMatchData for userId: ${userId || "unknown"}, user2Id: ${
        req.body.user2Id || "unknown"
      } - ${error.message}`
    );
    return res
      .status(error.message === "User not found" ? 404 : 500)
      .json({ message: error.message === "User not found" ? "User not found" : "Server error" });
  } finally {
    if (connection) {
      connection.release();
      console.log("Database connection released");
    }
  }
};

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

    // Lấy matches chưa có tin nhắn
    const [matchesWithoutMessages] = await connection.query(
      `
      SELECT m.id AS chatId, u.id AS userId, u.username AS name, u.date_of_birth, p.city, ph.photo_url AS imgUrl
      FROM Matches m
      JOIN Users u ON (m.user1_id = u.id AND m.user2_id = ?) OR (m.user2_id = u.id AND m.user1_id = ?)
      LEFT JOIN Profiles p ON u.id = p.user_id
      LEFT JOIN Photos ph ON u.id = ph.user_id AND ph.is_primary = 1
      WHERE m.status = 'accepted' AND m.id NOT IN (SELECT chat_id FROM Messages)
      AND u.id != ?
      `,
      [userId, userId, userId]
    );

    // Tính tuổi và định dạng dữ liệu
    const host = req.get("host") || "192.168.0.100:8888";
    const formattedMatches = matchesWithoutMessages.map((match) => {
      const dob = new Date(match.date_of_birth);
      let age = 0;
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
      }
      return {
        id: match.chatId.toString(),
        userId: match.userId.toString(), // Trả về userId của người đối diện
        name: match.name || "Unknown",
        age: age || 0,
        imgUrl: match.imgUrl ? `${req.protocol}://${host}/uploads/${path.basename(match.imgUrl)}` : "https://via.placeholder.com/100",
        isOnline: false, // Có thể thêm logic kiểm tra online
      };
    });

    // Lấy chats đã có tin nhắn
    const [chatsWithMessages] = await connection.query(
      `
      SELECT m.id AS chatId, u.id AS userId, u.username AS name, u.date_of_birth, p.city, ph.photo_url AS imgUrl, msg.text AS lastMessage, msg.timestamp AS timeSent
      FROM Matches m
      JOIN Users u ON (m.user1_id = u.id AND m.user2_id = ?) OR (m.user2_id = u.id AND m.user1_id = ?)
      LEFT JOIN Profiles p ON u.id = p.user_id
      LEFT JOIN Photos ph ON u.id = ph.user_id AND ph.is_primary = 1
      LEFT JOIN Messages msg ON m.id = msg.chat_id
      WHERE m.status = 'accepted' AND u.id != ?
      GROUP BY m.id, u.id, u.username, u.date_of_birth, p.city, ph.photo_url, msg.text, msg.timestamp
      ORDER BY msg.timestamp DESC
      `,
      [userId, userId, userId]
    );

    const formattedChats = chatsWithMessages.map((chat) => {
      const dob = new Date(chat.date_of_birth);
      let age = 0;
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
      }
      return {
        id: chat.chatId.toString(),
        userId: chat.userId.toString(), // Trả về userId của người đối diện
        name: chat.name || "Unknown",
        age: age || 0,
        imgUrl: chat.imgUrl ? `${req.protocol}://${host}/uploads/${path.basename(chat.imgUrl)}` : "https://via.placeholder.com/100",
        lastMessage: chat.lastMessage || "No message",
        timeSent: chat.timestamp || new Date().toISOString(),
        isOnline: false, // Có thể thêm logic kiểm tra online
      };
    });

    await connection.commit();
    res.status(200).json({ matchesWithoutMessages: formattedMatches, chatsWithMessages: formattedChats });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error fetching chats for userId: ${req.userId || 'unknown'} - ${error.message}`);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

const blockUser = async (req, res) => {
  let connection;
  try {
    // Lấy token từ header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Giải mã token để lấy userId
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const blockerId = decoded.userId; // Sử dụng blocker_id thay vì user_id
    const blockedId = req.params.userId;

    // Log để debug
    console.log("blockerId:", blockerId, "blockedId:", blockedId);

    // Kết nối tới cơ sở dữ liệu
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Kiểm tra xem người bị block có tồn tại không
    const [user] = await connection.query("SELECT id FROM Users WHERE id = ?", [blockedId]);
    if (user.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    // Kiểm tra xem đã block chưa (sửa user_id thành blocker_id, blocked_user_id thành blocked_id)
    const [existingBlock] = await connection.query(
      "SELECT id FROM BlockedUsers WHERE blocker_id = ? AND blocked_id = ?",
      [blockerId, blockedId]
    );
    if (existingBlock.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "User already blocked" });
    }

    // Thêm bản ghi block (sửa user_id thành blocker_id, blocked_user_id thành blocked_id)
    await connection.query(
      "INSERT INTO BlockedUsers (blocker_id, blocked_id) VALUES (?, ?)",
      [blockerId, blockedId]
    );

    await connection.commit();
    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error blocking user:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const reportUser = async (req, res) => {
  let connection;
  try {
    // Lấy token từ header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Giải mã token để lấy userId
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const reporterId = decoded.userId;
    const reportedUserId = req.params.userId;
    const { reportType } = req.body; // Lấy loại báo cáo từ request body

    // Kết nối tới cơ sở dữ liệu
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Kiểm tra xem người bị report có tồn tại không
    const [user] = await connection.query("SELECT id FROM Users WHERE id = ?", [reportedUserId]);
    if (user.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    // Kiểm tra xem đã báo cáo chưa
    const [existingReport] = await connection.query(
      "SELECT id FROM Reports WHERE reporter_id = ? AND reported_user_id = ?",
      [reporterId, reportedUserId]
    );
    if (existingReport.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "You have already reported this user" });
    }

    // Thêm bản ghi report với report_type
    await connection.query(
      "INSERT INTO Reports (reporter_id, reported_user_id, reason, report_type, status) VALUES (?, ?, ?, ?, ?)",
      [reporterId, reportedUserId, "Reported via chat", reportType, "pending"]
    );

    await connection.commit();
    res.status(200).json({ message: "User reported successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error reporting user:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const getProfileById = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const currentUserId = decoded.userId; // ID của người dùng hiện tại
    const targetUserId = parseInt(req.params.userId, 10); // ID của người dùng cần xem profile

    if (isNaN(targetUserId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    connection = await pool.getConnection();

    // Kiểm tra xem người dùng có bị chặn không
    const [blocked] = await connection.query(
      "SELECT * FROM BlockedUsers WHERE blocker_id = ? AND blocked_id = ?",
      [currentUserId, targetUserId]
    );
    if (blocked.length > 0) {
      return res.status(403).json({ message: "You cannot view this profile" });
    }

    const [users] = await connection.query(
      "SELECT username, date_of_birth FROM Users WHERE id = ? ",
      [targetUserId]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = users[0];

    const dob = new Date(user.date_of_birth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    const [profiles] = await connection.query(
      "SELECT * FROM Profiles WHERE user_id = ?",
      [targetUserId]
    );
    const profile = profiles.length > 0 ? profiles[0] : {};

    const [photos] = await connection.query(
      "SELECT id, photo_url FROM Photos WHERE user_id = ? ORDER BY is_primary DESC, uploaded_at DESC",
      [targetUserId]
    );

    const host = req.get("host") || "192.168.0.100:8888";
    const responseData = {
      name: user.username || "Unknown",
      age: age || 0,
      avatar: photos.length > 0 && photos[0].photo_url
        ? `${req.protocol}://${host}/uploads/${path.basename(photos[0].photo_url)}`
        : "https://via.placeholder.com/150",
      bio: profile.bio || "",
      hobbies: profile.interests ? profile.interests.split(",") : [],
      height: profile.height || 0,
      occupation: profile.occupation || "Not specified",
      education: profile.education || "Not specified",
      looking_for: profile.looking_for || "Not specified",
      photos: photos.map(photo => ({
        id: photo.id ? photo.id.toString() : "0",
        imgUrl: photo.photo_url
          ? `${req.protocol}://${host}/uploads/${path.basename(photo.photo_url)}`
          : "https://via.placeholder.com/100",
      })),
    };

    console.log("Profile data for userId:", targetUserId, responseData);
    res.status(200).json(responseData);
  } catch (error) {
    console.error(`Error getting profile for userId: ${req.params.userId || 'unknown'} - ${error.message}`);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

const uploadPhoto = [
  upload.single("photo"),
  async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }

      const photoUrl = `/uploads/${req.file.filename}`;

      let isPrimary = 0;
      let connection = await pool.getConnection();
      await connection.beginTransaction();

      // Kiểm tra và cập nhật ảnh primary hiện tại
      const [existingPrimary] = await connection.query(
        "SELECT id FROM Photos WHERE user_id = ? AND is_primary = 1",
        [userId]
      );

      if (existingPrimary.length === 0) {
        isPrimary = 1; // Ảnh mới là primary nếu không có ảnh primary nào
      } else {
        // Đặt tất cả ảnh primary hiện tại thành 0
        await connection.query(
          "UPDATE Photos SET is_primary = 0 WHERE user_id = ? AND is_primary = 1",
          [userId]
        );
        isPrimary = 1; // Ảnh mới sẽ là primary
      }

      // Chèn ảnh mới
      await connection.query(
        "INSERT INTO Photos (user_id, photo_url, is_primary, uploaded_at) VALUES (?, ?, ?, NOW())",
        [userId, photoUrl, isPrimary]
      );

      await connection.commit();
      res.status(200).json({ message: "Photo uploaded successfully", photo_url: photoUrl });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error(`Error uploading photo for userId: ${req.userId || 'unknown'} - ${error.message}`, error.stack);
      next(error);
    } finally {
      if (connection) connection.release();
    }
  },
];

module.exports = { updateUserProfile, deletePhoto, updateProfile, getProfile, getProfileById,
  discoverProfiles, getMatchedProfiles, getPendingLikes, getDislikedProfiles,blockUser ,reportUser,
  sendMatchData, getChats, uploadPhoto, notifyLike };