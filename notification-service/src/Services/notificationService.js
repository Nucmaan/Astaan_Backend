const axios = require("axios");
const Notification = require("../Models/notificationModel");

const userServiceUrl = process.env.USER_SERVICE_URL;

const getUserFromService = async (userId) => {
  try {
    const response = await axios.get(
      `${userServiceUrl}/api/auth/users/${userId}`
    );
    return response.data.user;
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

const getAllNotifications = async () => {
  try {
    const notifications = await Notification.findAll({
      order: [['created_at', 'DESC']]
    });
    
    return {
      success: true,
      data: notifications
    };
  } catch (error) {
    console.error("Error fetching notifications:", error.message);
    return {
      success: false,
      message: "Failed to fetch notifications"
    };
  }
};

const getNotificationsByUserId = async (userId) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
    
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
    
    await notification.destroy();
    
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
}