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

const countAllSubTasks = async (req, res) => {
  try {
    const result = await subTaskService.countAllSubTasks();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


async function create(req, res) {
  try {
    const subtask = await subTaskService.create(req.body);
    res.status(201).json(subtask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function list(req, res) {
  try {
    const { rows, count } = await subTaskService.list(req.query);
    res.json({ data: rows, total: count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getById(req, res) {
  try {
    const subtask = await subTaskService.getById(req.params.id);
    if (!subtask) return res.status(404).json({ message: 'SubTask not found' });
    res.json(subtask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function update(req, res) {
  try {
    const subtask = await subTaskService.update(req.params.id, req.body);
    if (!subtask) return res.status(404).json({ message: 'SubTask not found' });
    res.json(subtask);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function remove(req, res) {
  try {
    const ok = await subTaskService.remove(req.params.id);
    if (!ok) return res.status(404).json({ message: 'SubTask not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getAssignedTasks(req, res) {
  try {
    const empId = req.params.empId;
    const tasks = await subTaskService.getAssignedTasks(empId);
    res.json(tasks);
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
}
 
async function getCompletedTasks(req, res) {
  try {
    const empId = req.params.empId;
    const tasks = await subTaskService.getCompletedTasks(empId);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function usersWithCompletedSubtasks(req, res) {
  try {
    const { month } = req.query;  
    const rows = await subTaskService.usersWithCompletedSubtasks(month);
    if (rows.length === 0) {
      return res.json({ message: `No users with completed tasks in ${month || 'the current month'}` });
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


async function completedByDefaultRole(req, res) {
  try {
    const data = await subTaskService.completedTasksByDefaultRole();
    if (!data.length) {
      return res.status(404).json({ message: 'No completed subtasks for Admin role' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}


async function subtasksByAssignee(req, res) {
  try {
    const empId = req.params.empId;
    const subtasks = await subTaskService.getSubtasksByAssignee(empId);
    if (!subtasks.length) {
      return res.status(404).json({ message: `No subtasks found for assignee_empId ${empId}` });
    }
    res.json(subtasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function statusCountByAssignedTo(req, res) {
  try {
    const empId = req.params.empId;
    const counts = await subTaskService.getStatusCountByAssignedTo(empId);
    res.json(counts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

const finSubTasksByTaksId = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const subtasks = await subTaskService.finSubTasksByTaksId(taskId);
    if (!subtasks.length) {
      return res.status(404).json({ message: `No subtasks found for task_id ${taskId}` });
    }
    res.json({ success: true, subtasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {

  createSubTask,
  getAllSubTasks,
  getSubTaskById,
  updateSubTask,
  deleteSubTask,
  getSubTasksByTaskId,
  countAllSubTasks,

  create, 
  list, 
  getById, 
  update, 
  remove,
  getAssignedTasks,
  getCompletedTasks,
  usersWithCompletedSubtasks,
  completedByDefaultRole,
  subtasksByAssignee,
  statusCountByAssignedTo,
  finSubTasksByTaksId
};
