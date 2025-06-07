const { createProject, getAllProjects, getSingleProject, deleteProject, updateProject } = require('../Controllers/Project');
const Router = require('express').Router();
const { upload } = require('../middleware/uploadMiddleware.js'); 

Router.post('/createProject',upload.single('project_image'), createProject);
Router.get('/allProjectList',getAllProjects);
Router.get('/singleProject/:id',getSingleProject);
Router.delete('/projectDelete/:id',deleteProject);
Router.put('/updateProject/:id',upload.single('project_image'),updateProject);

module.exports = Router
