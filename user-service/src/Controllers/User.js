const UserService = require("../Services/UserService.js");
 
const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password, role, employee_id } = req.body;

    const user = await UserService.registerUser(name, email, password, mobile, role, req.file, employee_id);

    if (!user.success) {
      return res.status(400).json({ success: false, message: user.message });
    }

    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const result = await UserService.loginUser(identifier, password);
    
    if (!result.success) {
      return res.status(401).json({ 
        success: false,
        message: result.message
      });
    }

    const { accessToken, refreshToken, user } = result;

    res
      .status(200)
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "Strict",
        expires: new Date(Date.now() + 15 * 60 * 1000),  
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: "Strict",
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  
      })
      .json({
        success: true,
        message: "User logged in successfully",
        user,
        accessToken,
        refreshToken,
      });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await UserService.getUsers();
    res.status(200).json({ message: "All Users", users });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const getSingleUser = async (req, res) => {
  try {
    const user = await UserService.getSingleUser(req.params.id);
    res.status(200).json({ message: "User details", user });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await UserService.deleteUser(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    await UserService.updateUser(req.params.id, req.body, req.file);
    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const forgetPassword = async (req, res) => {
  try {
    await UserService.forgetPassword(req.body.email);
    res
      .status(200)
      .json({ message: "Reset link sent to your email successfully!" });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    await UserService.resetPassword(req.body.token, req.body.newPassword);
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");

    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while logging out" });
  }
};

// Dashboard controller
const getDashboardData = async (req, res) => {
  try {
    const data = await UserService.DashboardData();
    res.status(200).json({ success: true, dashboard: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getSingleUser,
  deleteUser,
  updateUser,
  forgetPassword,
  resetPassword,
  logoutUser,
  getDashboardData,
};
