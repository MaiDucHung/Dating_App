const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const path = require('path');
const fs = require('fs');

const uploadPhoto = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const userId = decoded.userId;

    if (!req.file) {
      return res.status(400).json({ message: "No photo uploaded" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const photoUrl = `/uploads/${req.file.filename}`;
    const [result] = await connection.query(
      `
      INSERT INTO Photos (user_id, photo_url, is_primary)
      VALUES (?, ?, ?)
      `,
      [userId, photoUrl, 0]
    );

    // Kiểm tra xem có cần đặt ảnh này làm ảnh chính không
    const [existingPhotos] = await connection.query(
      `
      SELECT id FROM Photos WHERE user_id = ? AND is_primary = 1
      `,
      [userId]
    );

    if (existingPhotos.length === 0) {
      await connection.query(
        `
        UPDATE Photos SET is_primary = 1 WHERE id = ?
        `,
        [result.insertId]
      );
    }

    await connection.commit();

    // Tạo URL đầy đủ để trả về
    const host = req.get("host") || "192.168.0.100:8888";
    const fullPhotoUrl = `${req.protocol}://${host}${photoUrl}`;

    res.status(200).json({
      photoId: result.insertId,
      photoUrl: fullPhotoUrl,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error(`Error uploading photo for userId: ${req.userId || "unknown"} - ${error.message}`);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

const deletePhoto = async (req, res, next) => {
  let connection;
  try {
    // 1. Xác thực token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("No token provided in request");
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log(`Received token: ${token}`);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
      console.log(`Decoded token: userId=${decoded.userId}`);
    } catch (jwtError) {
      console.error(`JWT verification failed: ${jwtError.message}`);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const userId = decoded.userId;
    const photoId = parseInt(req.params.photoId, 10);

    if (isNaN(photoId)) {
      console.warn(`Invalid photoId: ${req.params.photoId}`);
      return res.status(400).json({ message: "Invalid photo ID" });
    }

    console.log(`Deleting photo with ID ${photoId} for user ${userId}`);

    // 2. Lấy connection và bắt đầu transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 3. Đếm số lượng ảnh của người dùng
    const [photoCount] = await connection.query(
      `SELECT COUNT(*) as count 
       FROM Photos 
       WHERE user_id = ?`,
      [userId]
    );

    if (photoCount[0].count <= 1) {
      console.warn(`User ${userId} has only one photo, deletion not allowed`);
      return res.status(403).json({ message: "Cannot delete the last photo" });
    }

    // 4. Lấy thông tin photo từ DB
    const [rows] = await connection.query(
      `SELECT photo_url, is_primary 
       FROM Photos 
       WHERE id = ? AND user_id = ?`,
      [photoId, userId]
    );

    if (rows.length === 0) {
      console.log(`Photo with ID ${photoId} not found for user ${userId}`);
      return res.status(404).json({ message: "Photo not found" });
    }

    const photoUrl = rows[0].photo_url; 
    console.log(`Photo URL from DB: ${photoUrl}`);

    // 5. Xóa file trên server (upload folder)
    let photoPath = null;
    if (photoUrl.startsWith("/uploads/")) {
      const relativePath = photoUrl.replace("/uploads/", "");
      photoPath = path.resolve(__dirname, "../../uploads", relativePath);
      console.log(`Resolved photo path: ${photoPath}`);
    } else {
      console.warn(`Unexpected photo URL format: ${photoUrl}`);
    }

    if (photoPath) {
      console.log(`Attempting to delete file at: ${photoPath}`);
      if (fs.existsSync(photoPath)) {
        try {
          fs.unlinkSync(photoPath);
          console.log(`Deleted file: ${photoPath}`);
        } catch (fileError) {
          console.error(`Error deleting file ${photoPath}: ${fileError.message}`);
        }
      } else {
        console.warn(`File not found on disk: ${photoPath}`);
      }
    }

    // 6. Nếu ảnh đó là is_primary = 1, gán ảnh khác làm primary
    if (rows[0].is_primary === 1) {
      const [otherPhotos] = await connection.query(
        `SELECT id FROM Photos 
         WHERE user_id = ? AND id != ? 
         ORDER BY id DESC 
         LIMIT 1`,
        [userId, photoId]
      );
      if (otherPhotos.length > 0) {
        await connection.query(
          `UPDATE Photos 
           SET is_primary = 1 
           WHERE id = ?`,
          [otherPhotos[0].id]
        );
        console.log(`Set new primary photo with ID ${otherPhotos[0].id}`);
      }
    }

    // 7. Xóa bản ghi photo trong DB
    const [deleteResult] = await connection.query(
      `DELETE FROM Photos 
       WHERE id = ? AND user_id = ?`,
      [photoId, userId]
    );

    if (deleteResult.affectedRows === 0) {
      console.warn(`No rows deleted for photoId: ${photoId}`);
      throw new Error("Failed to delete photo from database");
    }

    // 8. Commit transaction
    await connection.commit();
    console.log(`Photo with ID ${photoId} deleted successfully from DB`);
    return res.status(200).json({ message: "Photo deleted successfully" });

  } catch (error) {
    console.error(`Error in deletePhoto: ${error.message}\n${error.stack}`);
    if (connection) {
      try {
        await connection.rollback();
        console.log("Transaction rolled back");
      } catch (rbErr) {
        console.error(`Rollback failed: ${rbErr.message}`);
      }
    }
    return res.status(500).json({ message: "Server error", error: error.message });

  } finally {
    if (connection) {
      try {
        connection.release();
        console.log("Database connection released");
      } catch (releaseErr) {
        console.error(`Error releasing connection: ${releaseErr.message}`);
      }
    }
  }
};

module.exports = { uploadPhoto, deletePhoto };