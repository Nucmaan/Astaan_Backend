
const Task = require("../Model/TasksModel.js");
const axios = require("axios");
const { uploadFileToS3, deleteFileFromS3 } = require("../utills/s3SetUp.js");

const projectServiceUrl = process.env.PROJECT_SERVICE_URL;
 
const checkProjectExists = async (project_id) => {
    try {
         if (!project_id || project_id === 'undefined' || isNaN(parseInt(project_id))) {
            return { success: false, message: "Invalid project ID provided" };
        }

        const response = await axios.get(`${projectServiceUrl}/api/project/singleProject/${project_id}`);

         if (response.data && response.data.success && response.data.project) {
            const project = response.data.project;

            return {
                success: true,
                project: {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    deadline: project.deadline,
                    status: project.status,
                    priority: project.priority,
                    progress: project.progress,
                    project_image: project.project_image,
                    project_type: project.project_type,
                    created_at: project.created_at,
                    updated_at: project.updated_at,
                    creator: {
                        id: project.creator_id,
                        name: project.creator_name,
                        email: project.creator_email,
                        role: project.creator_role,
                        profile_image: project.creator_profile_image
                    }
                }
            };
        }

        return { success: false, message: "Project not found" };
    } catch (error) {
        console.error("Error fetching project details:", error.message);
        return { success: false, message: "project id not found", error: error.message };
    }
};

const createTask = async (taskData, file) => {
    try {
        const { title, description, project_id, status, priority, deadline, estimated_hours } = taskData;

        if (!title || !project_id) {
            return { success: false, message: "Title and Project ID are required." };
        }

        if (estimated_hours && estimated_hours <= 0) {
            return { success: false, message: "Estimated hours must be greater than 0." };
        }

        const projectCheck = await checkProjectExists(project_id);
        if (!projectCheck.success) {
            return { success: false, message: projectCheck.message };
        }

         let file_url = null;
        if (file) {
            try {
                file_url = await uploadFileToS3(file);
            } catch (error) {
                console.error("Error uploading file to S3:", error.message);
                return { success: false, message: "Failed to upload file", error: error.message };
            }
        }

        const newTask = await Task.create({
            title,
            description,
            project_id,
            status: status || "To Do",
            priority: priority || "Medium",
            deadline,
            estimated_hours,
            file_url,
        });

        return { success: true, message: "Task created successfully", task: newTask };
    } catch (error) {
        console.error("Error creating task:", error.message);
        return { success: false, message: "Error creating task", error: error.message };
    }
};

const getSingleTask = async (id) => {
    try {
        if (!id) {
            return { success: false, message: "Invalid task ID" };
        }

        const task = await Task.findOne({
            where: { id },
            attributes: ['id', 'title', 'description', 'status', 'project_id', 'priority', 'deadline', 'estimated_hours', 'file_url', 'completed_at']
        });

        if (!task) {
            return { success: false, message: "Task not found" };
        }
 
        const projectCheck = await checkProjectExists(task.project_id);

        if (projectCheck.success) {
            return { 
                success: true,
                task: {
                    ...task.get(),  
                    project: projectCheck.project
                }
            };
        }
        return {
            success: true,
            task: {
                ...task.get(),
                project: null,
                error: "Project not found"
            }
        };
    } catch (error) {
        console.error("Error fetching task:", error.message);
        return { success: false, message: "Error fetching task", error: error.message };
    }
};

const getAllTasks = async () => {
    try {

        const tasks = await Task.findAll({
            attributes: ['id', 'title', 'description', 'status', 'project_id', 'priority', 'deadline', 'estimated_hours', 'file_url', 'completed_at'], 
        });

        const tasksWithProjectDetails = await Promise.all(
            tasks.map(async (task) => {
                const projectCheck = await checkProjectExists(task.project_id); 

                if (projectCheck.success) {
                    return {
                        ...task.get(), 
                        project: projectCheck.project,
                    };
                }

                return {
                    ...task.get(),
                    project: null,
                    error: "Project not found",
                };
            })
        );

        return { success: true, tasks: tasksWithProjectDetails };
    } catch (error) {
        console.error("Error fetching tasks:", error.message);
        throw new Error(error.message);
    }
};

const deleteTask = async (id) => {
    try {
        if (!id) {
            return { success: false, message: "Invalid task ID" };
        }

        const task = await Task.findByPk(id);

        if (!task) {
            return { success: false, message: "Task not found" };
        }

         if (task.file_url) {
            try {
                await deleteFileFromS3(task.file_url);
            } catch (error) {
                console.error("Error deleting file from S3:", error.message);
            }
        }

        await task.destroy();

        return { success: true, message: "Task deleted successfully" };
    } catch (error) {
        console.error("Error deleting task:", error.message);
        return { success: false, message: "Error deleting task", error: error.message };
    }
};

const getAllProjectTasks = async (project_id) => {
    try {
        if (!project_id) {
            return { success: false, message: "Invalid project ID" };
        }

         const projectCheck = await checkProjectExists(project_id);

        if (!projectCheck.success) {
            return { success: false, message: "Project not found" };
        }

         const tasks = await Task.findAll({
            where: { project_id }, 
            attributes: [
                "id",
                "title",
                "description",
                "status",
                "priority",
                "deadline",
                "estimated_hours",
                "file_url",
                "completed_at",
            ],
        });

        if (tasks.length === 0) {
            return { success: false, message: "No tasks found for this project" };
        }

         return { success: true, project: projectCheck.project, tasks };
    } catch (error) {
        console.error("Error fetching project tasks:", error.message);
        return { success: false, message: "Error fetching project tasks", error: error.message };
    }
};

const updateTask = async (id, taskData, file) => {
    try {
        const { title, description, project_id, status, priority, deadline, estimated_hours, completed_at } = taskData;
       
        const currentTask = await Task.findOne({
            where: { id },
            attributes: ['file_url', 'project_id']
        });

        if (!currentTask) {
            return { success: false, message: "Task not found" };
        }

        if (project_id && project_id !== currentTask.project_id) {
            const projectResponse = await checkProjectExists(project_id);
            if (!projectResponse.success) {
                return { success: false, message: "Invalid project ID. Project does not exist." };
            }
        }

         let file_url = null;
        if (file) {
            try {
                 file_url = await uploadFileToS3(file);
                
                 if (currentTask.file_url) {
                    try {
                        await deleteFileFromS3(currentTask.file_url);
                    } catch (error) {
                        console.error("Error deleting old file from S3:", error.message);
                     }
                }
            } catch (error) {
                console.error("Error uploading new file to S3:", error.message);
                return { success: false, message: "Failed to upload file", error: error.message };
            }
        }

        const updatedData = {};

        if (title) updatedData.title = title;
        if (description) updatedData.description = description;
        if (project_id) updatedData.project_id = project_id;
        if (status) updatedData.status = status;
        if (priority) updatedData.priority = priority;
        if (deadline) updatedData.deadline = deadline;
        if (estimated_hours) updatedData.estimated_hours = estimated_hours;
        if (completed_at) updatedData.completed_at = completed_at;
        if (file_url) updatedData.file_url = file_url;

        if (Object.keys(updatedData).length === 0) {
            return { success: false, message: "No fields provided for update" };
        }

        await Task.update(updatedData, { where: { id } });

        const updatedTask = await Task.findOne({ where: { id } });

        return {
            success: true,
            message: "Task updated successfully",
            task: updatedTask
        };
    } catch (error) {
        console.error("Error updating task:", error.message);
        return { success: false, message: "Error updating task", error: error.message };
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
