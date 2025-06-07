const SubTask = require("../Model/subTask.js");
const { uploadFileToS3, deleteFileFromS3 } = require("../utills/s3SetUp.js");

createSubTask = async (data, file) => {
  try {
    let file_url = null;

    if (file) {
      try {
        file_url = await uploadFileToS3(file);
      } catch (uploadError) {
        console.error("Error uploading file to S3:", uploadError.message);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }
    }

    const subTask = await SubTask.create({
      ...data,
      file_url,
    });

    return subTask;
  } catch (error) {
    throw new Error(error.message);
  }
};

getAllSubTasks = async () => {
  return await SubTask.findAll();
};

getSubTaskById = async (id) => {
  return await SubTask.findByPk(id);
};

updateSubTask = async (id, data, file) => {
  try {
    const subTask = await SubTask.findByPk(id);
    if (!subTask) throw new Error("SubTask not found");

    let file_url = subTask.file_url;  

    if (file) {
      try {
         file_url = await uploadFileToS3(file);
        
         if (subTask.file_url) {
          try {
            await deleteFileFromS3(subTask.file_url);
          } catch (deleteError) {
            console.error("Error deleting old file from S3:", deleteError.message);
           }
        }
      } catch (uploadError) {
        console.error("Error uploading file to S3:", uploadError.message);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }
    }

    let updatedData = {
      ...data,
      file_url,
    };

    await subTask.update(updatedData);
    return subTask;
  } catch (error) {
    throw new Error(error.message);
  }
};

deleteSubTask = async (id) => {
  try {
    const subTask = await SubTask.findByPk(id);
    if (!subTask) throw new Error("SubTask not found");

     if (subTask.file_url) {
      try {
        await deleteFileFromS3(subTask.file_url);
      } catch (deleteError) {
        console.error("Error deleting file from S3:", deleteError.message);
       }
    }
    await subTask.destroy();
  } catch (error) {
    throw new Error(error.message);
  }
};

getSubTasksByTaskId = async (taskId) => {
    try {
        const subTasks = await SubTask.findAll({
            where: { task_id: taskId },
        });
        return subTasks;
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = { 
    createSubTask, 
    getAllSubTasks, 
    getSubTaskById, 
    updateSubTask, 
    deleteSubTask,
    getSubTasksByTaskId
};
