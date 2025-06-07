const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
 const sendResetLink = require("../utills/sendEmail.js");
const User = require("../model/User.js");
const { Op } = require("sequelize");

const { uploadFileToS3, deleteFileFromS3 } = require("../utills/s3SetUp");

const registerUser = async (
  name,
  email,
  password,
  mobile,
  role,
  file,
  employee_id
) => {
  try {
    if (!name || !email || !password || !mobile) {
      return {
        success: false,
        message: "All fields are required: name, email, password, and mobile.",
      };
    }

    if (password.length < 9) {
      return {
        success: false,
        message: "Password must be at least 9 characters long.",
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        message: "Please provide a valid email address.",
      };
    }

    const cleanMobile = mobile.trim().replace(/\D/g, "");

    let userProfileimage = "";
    if (file) {
      try {
         userProfileimage = await uploadFileToS3(file);
      } catch (uploadError) {
        console.error(
          "Failed to upload profile image to S3:",
          uploadError.message
        );
        return {
          success: false,
          message: `Profile image upload failed: ${uploadError.message}`,
        };
      }
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, ...(employee_id ? [{ employee_id }] : [])],
      },
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "employee ID";
      return {
        success: false,
        message: `User already exists with this ${field}.`,
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      employee_id,
      name,
      email,
      password: hashedPassword,
      mobile: cleanMobile,
      role: role || "User",
      profile_image: userProfileimage,
    });

    return {
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser.id,
        employee_id: newUser.employee_id,
        name: newUser.name,
        email: newUser.email,
        mobile: newUser.mobile,
        role: newUser.role,
        profile_image: newUser.profile_image,
        created_at: newUser.created_at,
      },
    };
  } catch (error) {
    console.error("Error in registerUser:", error.message);
    return {
      success: false,
      message: "Registration failed. Please try again later.",
    };
  }
};

const loginUser = async (identifier, password) => {
  try {
    if (!identifier || !password) {
      return {
        success: false,
        message: "Identifier (email or employee ID) and password are required.",
      };
    }

     const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

     const searchCondition = isEmail
      ? { email: identifier }
      : { employee_id: identifier };

    const user = await User.findOne({ where: searchCondition });

    if (!user) {
      return {
        success: false,
        message: "Invalid credentials",
      };
    }

     if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
      console.error("JWT secrets not defined in environment variables");
      return {
        success: false,
        message: "Authentication service configuration error",
      };
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return {
        success: false,
        message: "Invalid credentials",
      };
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

     const userData = {
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      profile_image: user.profile_image,
      created_at: user.created_at,
    };

    return {
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: userData,
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Authentication failed. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    };
  }
};

const getUsers = async () => {
  return await User.findAll({
    attributes: [
      "id",
      "employee_id",
      "name",
      "email",
      "mobile",
      "role",
      "profile_image",
      "work_experience_level",
      "created_at",
    ],
  });
};

const getSingleUser = async (id) => {
  const user = await User.findOne({
    where: { id },
    attributes: [
      "id",
      "employee_id",
      "name",
      "email",
      "mobile",
      "role",
      "profile_image",
      "created_at",
    ],
  });

  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

const deleteUser = async (id) => {
  const user = await User.findOne({ where: { id } });
  if (!user) throw new Error("User not found");

   if (user.profile_image && user.profile_image.includes("amazonaws.com")) {
    try {
      await deleteFileFromS3(user.profile_image);
      console.log("Profile image deleted from S3 successfully");
    } catch (deleteError) {
      console.warn(
        "Failed to delete profile image from S3:",
        deleteError.message
      );
     
    }
  }

   await user.destroy();
};

const updateUser = async (id, updateFields, file) => {
  const user = await User.findByPk(id);
  if (!user) throw new Error("User not found");

  if (file) {
    try {
      if (user.profile_image && user.profile_image.includes("amazonaws.com")) {
        try {
          await deleteFileFromS3(user.profile_image);
        } catch (deleteError) {
          console.warn(
            "Failed to delete old profile image from S3:",
            deleteError.message
          );
        }
      }

      const s3Url = await uploadFileToS3(file);
      updateFields.profile_image = s3Url;
    } catch (uploadError) {
      console.error("Failed to upload image to S3:", uploadError.message);
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }
  } else {
    updateFields.profile_image = user.profile_image;
  }

  if (updateFields.password) {
    const hashedPassword = await bcrypt.hash(updateFields.password, 10);
    updateFields.password = hashedPassword;
  }

  await user.update(updateFields);

  return user;
};

const forgetPassword = async (email) => {
  const user = await User.findOne({ where: { email } });

  if (!user) throw new Error("User not found");

  const resetToken = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "30m" }
  );

  await user.update({
    reset_token: resetToken,
    reset_token_expires: new Date(Date.now() + 60 * 60 * 1000),
  });

  const emailResponse = await sendResetLink(resetToken, email);
  if (!emailResponse.success) throw new Error("Failed to send reset link");
};

const resetPassword = async (token, newPassword) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const email = decoded.email;

  const user = await User.findOne({ where: { email } });

  if (
    !user ||
    !user.reset_token ||
    token !== user.reset_token ||
    user.reset_token_expires < new Date()
  ) {
    throw new Error("Invalid or expired token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await user.update({
    password: hashedPassword,
    reset_token: null,
    reset_token_expires: null,
  });
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
};
