const express = require("express");
const router = express.Router();

const {create, list, getById,finSubTasksByTaksId, update,statusCountByAssignedTo, subtasksByAssignee,remove,getAssignedTasks,getCompletedTasks, usersWithCompletedSubtasks, completedByDefaultRole, createSubTask,getAllSubTasks,getSubTaskById,updateSubTask,deleteSubTask, getSubTasksByTaskId, countAllSubTasks } = require("../Controllers/subTask.js");

const { upload } = require('../middleware/uploadMiddleware.js'); 

router.post("/create",upload.single("file_url"),createSubTask);
router.get("/allTasks",getAllSubTasks);
router.get("/getSingleSubTask/:id",getSubTaskById);
router.put("/UpdateSubTask/:id",upload.single("file_url"),updateSubTask);
router.delete("/DeleteSubTask/:id",deleteSubTask);
router.get("/task/:taskId",getSubTasksByTaskId);
router.get("/dashboard", countAllSubTasks);


router.post('/', create);
router.get('/', list);
router.get('/:id', getById);
router.patch('/:id', update);
router.delete('/:id', remove);
router.get('/assigned/:empId', getAssignedTasks); 
router.get('/completed/:empId',getCompletedTasks); 
router.get('/stats/users-completed', usersWithCompletedSubtasks);
router.get('/stats/admin/completed', completedByDefaultRole);
router.get('/assignee/:empId/subtasks', subtasksByAssignee);
router.get('/assigned/:empId/status-count',statusCountByAssignedTo);
router.get('/task/:taskId/subtasks',finSubTasksByTaksId);
 

module.exports = router;
