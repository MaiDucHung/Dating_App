// config/db.js
const mysql = require("mysql2/promise");
const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_DATABASE,
  MYSQL_USER,
  MYSQL_PASSWORD,
} = require("./dotenv");

const pool = mysql.createPool({
  host:               MYSQL_HOST,
  port:               MYSQL_PORT,
  user:               MYSQL_USER,
  password:           MYSQL_PASSWORD,
  database:           MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

pool.getConnection()
  .then(() => console.log("✔️ Connected to MySQL pool"))
  .catch((err) => console.error("❌ MySQL pool connection error:", err));

module.exports = pool;
