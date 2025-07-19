const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const redis = require("../utills/redisClient");
const sendResetLink = require("../utills/sendEmail");
const { uploadFileToGCS, deleteFileFromGCS } = require("../utills/gcpSetup");
const User = require("../model/User");

const USER_CACHE_TTL = 60 * 60 * 24; // 24 hours
const USER_COUNT_TTL = 60 * 60 * 24;
const USER_COUNT_KEY = "users:count";
const USER_ALL_PAGE_KEY = "users:page:1:limit:100";

// 🧹 Clear all paginated user cache
const clearUserPagesCache = async () => {
  const keys = await redis.keys("users:page:*");
  if (keys.length > 0) await redis.del(...keys);
};

// 🧠 Cache single user
const cacheUserById = async (user) => {
  if (!user) return;
  const key = `user:${user.id}`;
  await redis.set(key, JSON.stringify(user), "EX", USER_CACHE_TTL);
};

// 🟢 Register
const registerUser = async (name, email, password, mobile, role, file, employee_id) => {
  if (!name || !email || !password || !mobile)
    return { success: false, message: "All fields are required" };

  if (password.length < 9)
    return { success: false, message: "Password must be at least 9 characters long" };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return { success: false, message: "Invalid email format" };

  const existing = await User.findOne({
    where: { [Op.or]: [{ email }, ...(employee_id ? [{ employee_id }] : [])] },
  });
  if (existing)
    return { success: false, message: `User already exists with this email or employee ID` };

  const hashedPassword = await bcrypt.hash(password, 10);
  const cleanMobile = mobile.replace(/\D/g, "");
  let profile_image = "";

  if (file) {
    profile_image = await uploadFileToGCS(file);
  }

  const newUser = await User.create({
    employee_id,
    name,
    email,
    password: hashedPassword,
    mobile: cleanMobile,
    role: role || "User",
    profile_image,
  });

  await cacheUserById(newUser);
  await redis.del(USER_COUNT_KEY);
  await clearUserPagesCache();

  return {
    success: true,
    message: "User created successfully",
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      mobile: newUser.mobile,
      role: newUser.role,
      profile_image: newUser.profile_image,
    },
  };
};

// 🔐 Login
const loginUser = async (identifier, password) => {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const user = await User.findOne({
    where: isEmail ? { email: identifier } : { employee_id: identifier },
  });

  if (!user || !(await bcrypt.compare(password, user.password)))
    return { success: false, message: "Invalid credentials" };

  const accessToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ id: user.id, role: user.role }, process.env.REFRESH_SECRET, {
    expiresIn: "7d",
  });

  await cacheUserById(user);

  return {
    success: true,
    message: "Login successful",
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      employee_id : user.employee_id,
      role: user.role,
      profile_image: user.profile_image,
    },
  };
};

// 📥 Get all users with pagination
const getUsers = async (page = 1, limit = 100) => {
  const key = `users:page:${page}:limit:${limit}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const offset = (page - 1) * limit;
  const users = await User.findAll({
    limit,
    offset,
    order: [["created_at", "DESC"]],
    attributes: ["id", "employee_id", "name", "email", "mobile", "role", "profile_image","work_experience_level", "created_at"],
  });

  await redis.set(key, JSON.stringify(users), "EX", 600);
  return users;
};

// 📘 Get single user
const getSingleUser = async (id) => {
  const key = `user:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const user = await User.findByPk(id, {
    attributes: ["id", "employee_id", "name", "email", "mobile", "role", "profile_image","work_experience_level", "created_at"],
  });

  if (!user) throw new Error("User not found");
  await redis.set(key, JSON.stringify(user), "EX", USER_CACHE_TTL);
  return user;
};

// ✏️ Update
const updateUser = async (id, updateFields, file) => {
  const user = await User.findByPk(id);
  if (!user) throw new Error("User not found");

  if (file) {
    if (user.profile_image?.includes("googleapis.com")) {
      await deleteFileFromGCS(user.profile_image);
    }
    updateFields.profile_image = await uploadFileToGCS(file);
  }

  if (updateFields.password) {
    updateFields.password = await bcrypt.hash(updateFields.password, 10);
  }

  await user.update(updateFields);
  await cacheUserById(user);
  await redis.del(USER_COUNT_KEY);
  await clearUserPagesCache();

  return user;
};

// 🗑️ Delete
const deleteUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw new Error("User not found");

  if (user.profile_image?.includes("googleapis.com")) {
    await deleteFileFromGCS(user.profile_image);
  }

  await user.destroy();
  await redis.del(`user:${id}`);
  await redis.del(USER_COUNT_KEY);
  await clearUserPagesCache();
};

// 🕓 24hr CRON job: refresh count & page 1 cache
const refreshUserCache = async () => {
  const count = await User.count();
  const users = await User.findAll({
    limit: 100,
    offset: 0,
    order: [["created_at", "DESC"]],
    attributes: ["id", "employee_id", "name", "email", "mobile", "role", "profile_image", "created_at"],
  });

  await redis.set(USER_COUNT_KEY, count, "EX", USER_COUNT_TTL);
  await redis.set(USER_ALL_PAGE_KEY, JSON.stringify(users), "EX", 600);

  console.log("✅ User cache refreshed");
};

// 📊 Dashboard summary
const DashboardData = async () => {
  const count = await getUserCountWithCache();
  return { totalUsers: count };
};

// 🧮 Get count (cached)
const getUserCountWithCache = async () => {
  const cached = await redis.get(USER_COUNT_KEY);
  if (cached !== null) return parseInt(cached, 10);

  const count = await User.count();
  await redis.set(USER_COUNT_KEY, count, "EX", USER_COUNT_TTL);
  return count;
};

// 🔁 Forgot password
const forgetPassword = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error("User not found");

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "30m",
  });

  await user.update({
    reset_token: token,
    reset_token_expires: new Date(Date.now() + 60 * 60 * 1000),
  });

  const result = await sendResetLink(token, email);
  if (!result.success) throw new Error("Failed to send email");
};

// 🔒 Reset password
const resetPassword = async (token, newPassword) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findOne({ where: { email: decoded.email } });

  if (!user || user.reset_token !== token || user.reset_token_expires < new Date())
    throw new Error("Token invalid or expired");

  const hashed = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashed, reset_token: null, reset_token_expires: null });

  await redis.del(`user:${user.id}`);
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getSingleUser,
  updateUser,
  deleteUser,
  forgetPassword,
  resetPassword,
  getUserCountWithCache,
  DashboardData,
  refreshUserCache, // use this in 24hr cron job
};
