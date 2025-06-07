const multer = require("multer");

 const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
   const allowedTypes = [
    "image/jpeg",
    "image/png", 
    "image/jpg",
    "image/gif",
    "image/webp"
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024  
  }
});

module.exports = {
  upload
};
