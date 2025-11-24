const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random()*1e9) + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/png','image/jpeg','image/webp'];
  if (!allowed.includes(file.mimetype)) cb(new Error('Only png/jpg/webp allowed'));
  else cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 3 * 1024 * 1024 } });

router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file' });
  res.json({ path: '/uploads/' + req.file.filename });
});

module.exports = router;
