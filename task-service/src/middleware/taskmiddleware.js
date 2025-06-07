const multer = require("multer");

 const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
   const allowedTypes = [
    "image/jpeg",
    "image/png", 
    "image/jpg",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const TaskUpload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 
  }
});

module.exports = {
  TaskUpload
};
