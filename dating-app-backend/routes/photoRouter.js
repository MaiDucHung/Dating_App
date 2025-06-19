const express = require("express");
const router = express.Router();
const { uploadPhoto, deletePhoto } = require("../controllers/photoController");
const upload = require("../middleware/upload");

router.post("/", upload.single("photo"), uploadPhoto);
router.delete("/:photoId", deletePhoto);

module.exports = router;