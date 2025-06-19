const pool = require("../config/db");

class ProfileModel {
  static async create(userId) {
    await pool.query(
      `
      INSERT INTO Profiles (user_id)
      VALUES (?);
      `,
      [userId]
    );
  }

  static async checkProfileExists(userId) {
    const [rows] = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM Profiles
      WHERE user_id = ?;
      `,
      [userId]
    );
    return rows[0].count > 0;
  }
}

module.exports = ProfileModel;