const { registerUser, getUsers, loginUser, forgetPassword, resetPassword, getSingleUser, deleteUser, logoutUser, updateUser } = require('../Controllers/User');
const { authMiddleware } = require('../middleware/authMiddleware.js');

const Router = require('express').Router();
const { upload } = require('../middleware/uploadMiddleware.js'); 
 

Router.post('/register',upload.single('profileImage'),registerUser);
Router.post('/login', loginUser);
Router.get('/logout',logoutUser);
Router.get('/users',getUsers);
Router.get("/users/:id",getSingleUser);
Router.delete("/users/:id",deleteUser);
Router.put("/users/:id",upload.single('profileImage'),updateUser);
Router.post("/forgot-password", forgetPassword);
Router.post("/reset-password", resetPassword);

module.exports = Router

