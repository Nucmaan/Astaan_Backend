const TaskService = require("../Services/TaskService.js");

const createTask = async (req, res) => {
    try {
        const result = await TaskService.createTask(req.body, req.file);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error creating task", error: error.message });
    }
};

const getSingleTask = async (req, res) => {
    try {
        const result = await TaskService.getSingleTask(req.params.id);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching task", error: error.message });
    }
};

const getAllTasks = async (req, res) => {
    try {
        const result = await TaskService.getAllTasks();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching tasks", error: error.message });
    }
};

const deleteTask = async (req, res) => {
    try {
        const result = await TaskService.deleteTask(req.params.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting task", error: error.message });
    }
};

const getAllProjectTasks = async (req, res) => {
    try {
        const result = await TaskService.getAllProjectTasks(req.params.project_id);
        res.status(result.success ? 200 : 404).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching project tasks", error: error.message });
    }
};

const updateTask = async (req, res) => {
    try {
        const result = await TaskService.updateTask(req.params.id, req.body, req.file);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating task", error: error.message });
    }
};

module.exports = {
    createTask,
    getSingleTask,
    getAllTasks,
    deleteTask,
    getAllProjectTasks,
    updateTask
};
