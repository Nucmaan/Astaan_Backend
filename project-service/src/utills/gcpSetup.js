const path = require('path');
const keyPath = path.join(__dirname, 'key.json');
const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');

const storage = new Storage({
  keyFilename: keyPath,
});

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'ems_storage';
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Upload a file to GCS from memory buffer
 * @param {Object} file - The file object from multer (with buffer)
 * @returns {Promise<string>} - The GCS URL of the uploaded file
 */
const uploadFileToGCS = async (file) => {
  try {
    if (!file) throw new Error('No file provided');
    if (!file.buffer) throw new Error('File buffer not found. Make sure multer is configured with memory storage.');

    let optimizedBuffer = file.buffer;
    let fileName = file.originalname.replace(/\s+/g, '-');
    let contentType = file.mimetype;

     if (/image\/(jpeg|png|webp)/.test(file.mimetype)) {
       const sharpInstance = sharp(file.buffer).resize({ width: 1200, withoutEnlargement: true });
       if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
        optimizedBuffer = await sharpInstance.webp({ quality: 80 }).toBuffer();
        fileName = fileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        contentType = 'image/webp';
      } else if (file.mimetype === 'image/webp') {
        optimizedBuffer = await sharpInstance.webp({ quality: 80 }).toBuffer();
        contentType = 'image/webp';
      }
    }

    const timestamp = Date.now();
    const finalFileName = `${timestamp}-${fileName}`;
    const blob = bucket.file(finalFileName);
    const stream = blob.createWriteStream({
      resumable: false,
      contentType: contentType,
      public: true,
    });

    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.end(optimizedBuffer);
    });

    await blob.makePublic();

    return `https://storage.googleapis.com/${BUCKET_NAME}/${finalFileName}`;
  } catch (error) {
    console.error('Error uploading file to GCS:', error);
    throw new Error(`Failed to upload file to GCS: ${error.message}`);
  }
};

/**
 * Update (overwrite) a file in GCS
 * @param {Object} file - The file object from multer (with buffer)
 * @param {string} fileName - The name of the file to overwrite
 * @returns {Promise<string>} - The GCS URL of the updated file
 */
const updateFileInGCS = async (file, fileName) => {
  try {
    if (!file || !file.buffer) throw new Error('No file buffer provided');
    if (!fileName) throw new Error('No file name provided');
    const blob = bucket.file(fileName);
    const stream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
      public: true,
    });
    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('finish', resolve);
      stream.end(file.buffer);
    });
    await blob.makePublic();
    return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
  } catch (error) {
    console.error('Error updating file in GCS:', error);
    throw new Error(`Failed to update file in GCS: ${error.message}`);
  }
};

/**
 * Delete a file from GCS
 * @param {string} fileUrl - The public URL or file name
 * @returns {Promise<boolean>} - True if deleted
 */
const deleteFileFromGCS = async (fileUrl) => {
  try {
    if (!fileUrl) throw new Error('No file URL provided');
    // Accept either a full URL or just the file name
    let fileName = fileUrl;
    if (fileUrl.startsWith('http')) {
      fileName = fileUrl.split('/').pop();
    }
    await bucket.file(fileName).delete();
    return true;
  } catch (error) {
    console.error('Error deleting file from GCS:', error);
    throw new Error(`Failed to delete file from GCS: ${error.message}`);
  }
};

module.exports = {
  uploadFileToGCS,
  updateFileInGCS,
  deleteFileFromGCS,
  bucket,
};
