const axios = require("axios");
const Notification = require("../Models/notificationModel");
const { setCache, getCache, deleteCache } = require('../utills/redisOne.js');

const userServiceUrl = process.env.USER_SERVICE_URL;

const getUserFromService = async (userId) => {
  const cacheKey = `user:${userId}`;
  const cachedUser = await getCache(cacheKey);
  if (cachedUser) return cachedUser;

  try {
    const response = await axios.get(`${userServiceUrl}/api/auth/users/${userId}`);
    const user = response.data.user;
    await setCache(cacheKey, user, 600);
    return user;
  } catch (error) {
    console.error("Error fetching user:", error.message);
    return null;
  }
};

const SendNotification = async (userId, message) => {
  try {
    const user = await getUserFromService(userId);
    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    const message1 = `${user.name} ${message}`;

    const notification = await Notification.create({
      user_id: userId,
      user_name: user.name || "Unknown User",
      message: message1,
    });

    await deleteCache(`notifications:user:${userId}`);

    return {
      success: true,
      message: "Notification sent successfully",
      data: {
        id: notification.id,
        user_id: userId,
        user_name: user.name || "Unknown User",
        message: message1,
        created_at: notification.created_at
      }
    };
  } catch (error) {
    console.error("Error sending notification:", error.message);
    return {
      success: false,
      message: "Notification failed. Please try again later.",
    };
  }
};

const getAllNotifications = async (page = 1) => {
  const pageSize = 50;
  const offset = (page - 1) * pageSize;
  const cacheKey = `notifications:all:page:${page}`;

  const cached = await getCache(cacheKey);
  if (cached) {
    return {
      success: true,
      ...cached
    };
  }

  try {
    const total = await Notification.count();

    const notifications = await Notification.findAll({
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset
    });

    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    const result = {
      success: true,
      data: notifications,
      total,
      page,
      pageSize,
      totalPages,
      hasNext,
      hasPrevious
    };

    await setCache(cacheKey, result, 300);

    return result;
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    return {
      success: false,
      message: "Failed to fetch notifications"
    };
  }
};

const getNotificationsByUserId = async (userId) => {
  const cacheKey = `notifications:user:${userId}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return {
      success: true,
      data: cached
    };
  }

  try {
    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    await setCache(cacheKey, notifications, 300);

    return {
      success: true,
      data: notifications
    };
  } catch (error) {
    console.error("Error fetching user notifications:", error.message);
    return {
      success: false,
      message: "Failed to fetch user notifications"
    };
  }
};

const deleteAllNotifications = async () => {
  try {
    await Notification.destroy({
      where: {},
      truncate: true
    });
    return {
      success: true,
      message: "All notifications deleted successfully"
    };
  } catch (error) {
    console.error("Error deleting notifications:", error.message);
    return {
      success: false,
      message: "Failed to delete notifications"
    };
  }
};

const deleteNotification = async (notificationId) => {
  try {
    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
      return {
        success: false,
        message: "Notification not found"
      };
    }

    const userId = notification.user_id;
    await notification.destroy();

    await deleteCache(`notifications:user:${userId}`);

    return {
      success: true,
      message: "Notification deleted successfully"
    };
  } catch (error) {
    console.error("Error deleting notification:", error.message);
    return {
      success: false,
      message: "Failed to delete notification"
    };
  }
};

module.exports = {
  SendNotification,
  getAllNotifications,
  getNotificationsByUserId,
  deleteAllNotifications,
  deleteNotification
};
