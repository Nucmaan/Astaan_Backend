const ProjectService = require("../Services/ProjectService.js");

const createProject = async (req, res) => {
    try {
        const project = await ProjectService.createProject(req.body, req.file);
        res.status(201).json({ success: true, message: "Project created successfully", project });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error creating project", error: error.message });
    }
};

const getAllProjects = async (req, res) => {
    try {
        console.log("Request reached the project service");

        const projects = await ProjectService.getAllProjects();
        res.status(200).json({ success: true, projects });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching projects", error: error.message });
    }
};

const getSingleProject = async (req, res) => {
    try {
        const project = await ProjectService.getSingleProject(req.params.id);
        if (project) {
            res.status(200).json({ success: true, project });
        } else {
            res.status(404).json({ success: false, message: "Project not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching project", error: error.message });
    }
};

const deleteProject = async (req, res) => {
    try {
        const isDeleted = await ProjectService.deleteProject(req.params.id);
        if (isDeleted) {
            res.status(200).json({ success: true, message: "Project deleted successfully" });
        } else {
            res.status(404).json({ success: false, message: "Project not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting project", error: error.message });
    }
};

const updateProject = async (req, res) => {
    try {
        const updatedProject = await ProjectService.updateProject(req.params.id, req.body, req.file);
        res.status(200).json({ success: true, message: "Project updated successfully", project: updatedProject });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating project", error: error.message });
    }
};

module.exports = {
    createProject,
    getAllProjects,
    getSingleProject,
    deleteProject,
    updateProject
};
