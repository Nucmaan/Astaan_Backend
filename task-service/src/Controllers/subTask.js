const subTaskService = require("../Services/subTask.js");

createSubTask = async (req, res) => {
  try {
    const subTask = await subTaskService.createSubTask(req.body, req.file);
    res.status(201).json(subTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

getAllSubTasks = async (req, res) => {
  try {
    const subTasks = await subTaskService.getAllSubTasks();
    res.status(200).json(subTasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

getSubTaskById = async (req, res) => {
  try {
    const subTask = await subTaskService.getSubTaskById(req.params.id);
    if (!subTask) {
      return res.status(404).json({ message: "SubTask not found" });
    }
    res.status(200).json(subTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

updateSubTask = async (req, res) => {
  try {
    const subTask = await subTaskService.updateSubTask(req.params.id, req.body, req.file);
    res.status(200).json(subTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

deleteSubTask = async (req, res) => {
  try {
    await subTaskService.deleteSubTask(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

getSubTasksByTaskId  = async (req, res) => {
    try {
        const { taskId } = req.params;

        const subTasks = await subTaskService.getSubTasksByTaskId(taskId);

        if (!subTasks.length) {
            return res.status(404).json({ message: "No subtasks found for this task." });
        }

        res.status(200).json(subTasks);
    } catch (error) {
        console.error("Error fetching subtasks:", error);
        res.status(500).json({ message: "Server error", error: error.message });
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
