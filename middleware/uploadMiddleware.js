const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { isCloudinaryOn, uploadImageBuffer } = require('../config/cloudinary');

const PUBLIC_DIR = 'uploads';
const PRIVATE_DIR = 'private_uploads';
[PUBLIC_DIR, PRIVATE_DIR].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

const makeStorage = (dir) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      
      const unique = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
      cb(null, unique + path.extname(file.originalname).toLowerCase());
    },
  });


const makeFilter = (allowedMimes, allowedExts) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) return cb(null, true);
  cb(new Error('This file type is not allowed'));
};

const photoFilter = makeFilter(
  ['image/jpeg', 'image/png', 'image/webp'],
  ['.jpg', '.jpeg', '.png', '.webp']
);
const photoLimits = { fileSize: 2 * 1024 * 1024 }; 

const photoDiskUpload = multer({ storage: makeStorage(PUBLIC_DIR), limits: photoLimits, fileFilter: photoFilter });

const photoMemoryUpload = multer({ storage: multer.memoryStorage(), limits: photoLimits, fileFilter: photoFilter });

const noteUpload = multer({
  storage: makeStorage(PRIVATE_DIR),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: makeFilter(
    [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.doc', '.docx']
  ),
});


const run = (uploader) => (req, res, next) => {
  uploader(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message;
    res.status(400).json({ message });
  });
};


const uploadPhoto = (req, res, next) => {
  const cloud = isCloudinaryOn();
  const uploader = (cloud ? photoMemoryUpload : photoDiskUpload).single('photo');
  uploader(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message;
      return res.status(400).json({ message });
    }
    if (!req.file || !cloud) return next();
    try {
      
      req.file.filename = await uploadImageBuffer(req.file.buffer);
      next();
    } catch (uploadErr) {
      console.error('Cloudinary upload failed:', uploadErr.message);
      res.status(502).json({ message: 'Image upload failed. Please try again.' });
    }
  });
};

module.exports = {
  uploadPhoto,
  uploadNoteFile: run(noteUpload.single('file')),
};