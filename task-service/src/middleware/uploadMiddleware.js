const multer = require("multer");

 const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/gif",
    "application/pdf",                
    "application/msword",           
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
    "application/vnd.ms-excel",     
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
    "video/mp4",
    "video/x-msvideo",       
    "video/x-matroska",     
    "video/webm",
    "video/quicktime",      
    "video/3gpp",
    "video/3gpp2" 
   ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only audio, video, and document files are allowed"), false);
  }
};

 const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024 
  }
});

module.exports = {
  upload
};
