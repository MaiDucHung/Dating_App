const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const getPreferences = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const userId = decoded.userId;

    connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT * FROM Preferences WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        user_id: userId,
        min_age: 18,
        max_age: 100,
        max_distance: 0,
        preferred_gender: "",
        min_height: 0,
        max_height: 999,
        preferred_city: "",
        preferred_looking_for: "",
      });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error fetching preferences:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const updatePreferences = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    const userId = decoded.userId;
    const {
      min_age,
      max_age,
      max_distance,
      preferred_gender,
      min_height,
      max_height,
      preferred_city,
      preferred_looking_for,
    } = req.body;

    connection = await pool.getConnection();
    const [existing] = await connection.query(
      "SELECT * FROM Preferences WHERE user_id = ?",
      [userId]
    );

    if (existing.length === 0) {
      await connection.query(
        "INSERT INTO Preferences (user_id, min_age, max_age, max_distance, preferred_gender, min_height, max_height, preferred_city, preferred_looking_for) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          min_age || 18,
          max_age || 100,
          max_distance || 0,
          preferred_gender || "",
          min_height || 0,
          max_height || 999,
          preferred_city || "",
          preferred_looking_for || "",
        ]
      );
    } else {
      await connection.query(
        "UPDATE Preferences SET min_age = ?, max_age = ?, max_distance = ?, preferred_gender = ?, min_height = ?, max_height = ?, preferred_city = ?, preferred_looking_for = ? WHERE user_id = ?",
        [
          min_age || 18,
          max_age || 100,
          max_distance || 0,
          preferred_gender || "",
          min_height || 0,
          max_height || 999,
          preferred_city || "",
          preferred_looking_for || "",
          userId,
        ]
      );
    }

    res.status(200).json({ message: "Preferences updated successfully" });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { getPreferences, updatePreferences };