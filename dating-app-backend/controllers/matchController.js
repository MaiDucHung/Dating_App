const pool = require("../config/db");
const jwt = require("jsonwebtoken");

const sendMatchData = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Received token in matchController:", token); // Thêm log
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded); // Thêm log
    const user1Id = decoded.userId;
    const { user2Id, status } = req.body;
    console.log("Request body:", { user1Id, user2Id, status }); // Thêm log

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingMatch] = await connection.query(
      "SELECT * FROM Matches WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)",
      [user1Id, user2Id, user2Id, user1Id]
    );
    console.log("Existing match:", existingMatch); // Thêm log

    if (existingMatch.length > 0) {
      const match = existingMatch[0];
      if (match.user1_id === user1Id) {
        await connection.query(
          "UPDATE Matches SET user1_swiped = 1, status = ?, swiped_at = NOW() WHERE id = ?",
          [status || 'pending', match.id]
        );
        if (match.user2_swiped === 1 && status !== 'dislike1') {
          await connection.query(
            "UPDATE Matches SET status = 'accepted', matched_at = NOW() WHERE id = ?",
            [match.id]
          );
          return res.status(200).json({ message: "Match accepted", status: 'accepted' });
        }
      } else if (match.user2_id === user1Id) {
        await connection.query(
          "UPDATE Matches SET user2_swiped = 1, status = ?, swiped_at = NOW() WHERE id = ?",
          [status || 'pending', match.id]
        );
        if (match.user1_swiped === 1 && status !== 'dislike1') {
          await connection.query(
            "UPDATE Matches SET status = 'accepted', matched_at = NOW() WHERE id = ?",
            [match.id]
          );
          return res.status(200).json({ message: "Match accepted", status: 'accepted' });
        }
      }
    } else {
      await connection.query(
        "INSERT INTO Matches (user1_id, user2_id, user1_swiped, status, swiped_at) VALUES (?, ?, 1, ?, NOW())",
        [user1Id, user2Id, status || 'pending']
      );
    }

    await connection.commit();
    res.status(200).json({ message: "Match status updated successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error updating match:", error);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

const likeAfterDislike = async (req, res, next) => {
  let connection;
  try {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Received token in likeAfterDislike:", token);
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);
    const user1Id = decoded.userId;
    const { user2Id } = req.body;
    console.log("Request body:", { user1Id, user2Id });

    if (!user2Id) {
      return res.status(400).json({ message: "user2Id is required" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check for existing match
    const [existingMatch] = await connection.query(
      "SELECT * FROM Matches WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)",
      [user1Id, user2Id, user2Id, user1Id]
    );
    console.log("Existing match:", existingMatch);

    if (existingMatch.length > 0) {
      const match = existingMatch[0];
      
      // Case 1: User1 previously disliked (dislike1 or dislike2)
      if (match.user1_id === user1Id && match.status === 'dislike1') {
        await connection.query(
          "UPDATE Matches SET user1_swiped = 1, status = ?, swiped_at = NOW() WHERE id = ?",
          ['pending', match.id]
        );
        // Check if user2 has already swiped (liked)
        if (match.user2_swiped === 1) {
          await connection.query(
            "UPDATE Matches SET status = 'accepted', matched_at = NOW() WHERE id = ?",
            [match.id]
          );
          await connection.commit();
          return res.status(200).json({ message: "Match accepted", status: 'accepted' });
        }
      } else if (match.user2_id === user1Id && match.status === 'dislike2') {
        await connection.query(
          "UPDATE Matches SET user2_swiped = 1, status = ?, swiped_at = NOW() WHERE id = ?",
          ['pending', match.id]
        );
        // Check if user1 has already swiped (liked)
        if (match.user1_swiped === 1) {
          await connection.query(
            "UPDATE Matches SET status = 'accepted', matched_at = NOW() WHERE id = ?",
            [match.id]
          );
          await connection.commit();
          return res.status(200).json({ message: "Match accepted", status: 'accepted' });
        }
      } else {
        // Match exists but is not in a dislike state
        await connection.commit();
        return res.status(400).json({ message: "Cannot like again; match is not in a disliked state" });
      }
    } else {
      // No existing match, create a new one with pending status
      await connection.query(
        "INSERT INTO Matches (user1_id, user2_id, user1_swiped, status, swiped_at) VALUES (?, ?, 1, ?, NOW())",
        [user1Id, user2Id, 'pending']
      );
    }

    await connection.commit();
    res.status(200).json({ message: "Match status updated successfully" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error in likeAfterDislike:", error);
    next(error);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { sendMatchData,likeAfterDislike };