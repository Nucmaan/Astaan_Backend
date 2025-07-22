const express = require("express");
const router = express.Router();

const { createSubTask,getAllSubTasks,getSubtasksWithStatusByTaskId,getSubTaskById,updateSubTask,deleteSubTask, getSubTasksByTaskId, countAllSubTasks } = require("../Controllers/subTask.js");

const { upload } = require('../middleware/uploadMiddleware.js'); 

router.post("/create",upload.single("file_url"),createSubTask);
router.get("/allTasks",getAllSubTasks);
router.get("/getSingleSubTask/:id",getSubTaskById);
router.put("/UpdateSubTask/:id",upload.single("file_url"),updateSubTask);
router.delete("/DeleteSubTask/:id",deleteSubTask);
router.get("/task/:taskId",getSubTasksByTaskId);
router.get("/dashboard", countAllSubTasks);

module.exports = router;
