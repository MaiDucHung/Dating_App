const jwt = require("jsonwebtoken");
require("dotenv").config();

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  console.log("Received token in authMiddleware:", token); // Thêm log
  if (!token) {
    return res.status(401).json({ message: "Không có token, truy cập bị từ chối" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token in authMiddleware:", decoded); // Thêm log
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification error:", error); // Thêm log
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};

module.exports = authMiddleware;