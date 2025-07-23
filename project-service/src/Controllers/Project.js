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
<<<<<<< HEAD
         const page = parseInt(req.query.page, 10) || parseInt(req.body.page, 10) || 1;
        const isDeleted = await ProjectService.deleteProject(req.params.id, page);
=======
        const isDeleted = await ProjectService.deleteProject(req.params.id);
>>>>>>> parent of 2d23c43 (v0.01)
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

const getDashboardData = async (req, res) => {
    try {
        const data = await ProjectService.DashboardData();
        res.status(200).json({ success: true, dashboard: data });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching dashboard data", error: error.message });
    }
};

const getProjectsByType = async (req, res) => {
    try {
        const { project_type } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 15;
        const result = await ProjectService.getProjectsByType(project_type, page, pageSize);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching projects by type", error: error.message });
    }
};

const getAllProjectDetails = async (req, res) => {
    try {
        const details = await ProjectService.allProjectDetails();
        res.status(200).json({ success: true, details });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching project details", error: error.message });
    }
};

const getProjectsByTypePost = async (req, res) => {
    try {
        const { project_type, page } = req.body;
        const result = await ProjectService.getProjectsByTypePost(project_type, page || 1);
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching projects by type", error: error.message });
    }
};

module.exports = {
    createProject,
    getAllProjects,
    getSingleProject,
    deleteProject,
    updateProject,
    getDashboardData,
    getProjectsByType,
    getAllProjectDetails,
    getProjectsByTypePost
};
