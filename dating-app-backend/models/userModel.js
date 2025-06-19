const pool = require("../config/db");

class UserModel {
  static async findByEmailOrUsername(email, username) {
    const [rows] = await pool.query(
      "SELECT id FROM Users WHERE email = ?",
      [email]
    );
    return rows;
  }

  static async create({ username, email, password, date_of_birth, gender }) {
    const [result] = await pool.query(
      `
      INSERT INTO Users (username, email, password, date_of_birth, gender, is_verified, is_active, last_active)
      VALUES (?, ?, ?, ?, ?, 0, 1, NOW());
      `,
      [username, email, password, date_of_birth, gender]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await pool.query(
      "SELECT id, username, email, password FROM Users WHERE email = ? AND is_active = 1",
      [email]
    );
    return rows[0];
  }

  static async updateLastActive(userId) {
    await pool.query(
      "UPDATE Users SET last_active = NOW(), updated_at = NOW() WHERE id = ?",
      [userId]
    );
  }
}

module.exports = UserModel;