const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const ACCESS_KEY_ID = process.env.ACCESS_KEY;
const SECRET_ACCESS_KEY = process.env.SECRET_ACCESS_KEY;
const REGION = process.env.REGION;
const BUCKET_NAME = process.env.BUCKET_NAME;

 const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
  }
});

 
const uploadFileToS3 = async (file) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

     if (!file.buffer) {
      throw new Error('File buffer not found. Make sure multer is configured with memory storage.');
    }

     const timestamp = new Date().getTime();
    const fileName = `${timestamp}-${file.originalname.replace(/\s+/g, '-')}`;
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,  
      ContentType: file.mimetype
    };
    
    await s3Client.send(new PutObjectCommand(params));
    
     
     return `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

 
const deleteFileFromS3 = async (fileUrl) => {
  try {
    if (!fileUrl) {
      throw new Error('No file URL provided');
    }
    
     const fileName = fileUrl.split('/').pop();
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName
    };
    
    await s3Client.send(new DeleteObjectCommand(params));
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

module.exports = {
  uploadFileToS3,
  deleteFileFromS3,
  s3Client
};
