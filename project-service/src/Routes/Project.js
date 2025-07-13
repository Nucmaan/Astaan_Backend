const { createProject, getAllProjects,getProjectsByTypePost, getSingleProject, deleteProject, updateProject, getDashboardData, getProjectsByType, getAllProjectDetails } = require('../Controllers/Project');
const Router = require('express').Router();
const { upload } = require('../middleware/uploadMiddleware.js'); 

Router.post('/createProject',upload.single('project_image'), createProject);
Router.get('/allProjectList',getAllProjects);
Router.get('/singleProject/:id',getSingleProject);
Router.delete('/projectDelete/:id',deleteProject);
Router.put('/updateProject/:id',upload.single('project_image'),updateProject);
Router.get('/dashboard', getDashboardData);
Router.get('/projects/type/:project_type', getProjectsByType);
Router.get('/projects/details', getAllProjectDetails);
Router.post('/projects/byType', getProjectsByTypePost);

module.exports = Router
