const notificationService = require("../Services/notificationService");

const SendNotification = async (req, res) => {
  try {
    const { userId, message } = req.body;

    if(!userId) {
      return res.status(400).json({ message: "UserId is Required" });
    }

    if(!message) {
      return res.status(400).json({ message: "Message is Required" });
    }
    
    const response = await notificationService.SendNotification(userId, message);

    if (!response.success) {
      return res.status(400).json({ message: response.message });
    }
    
    res.status(201).json({ 
      message: "Notification sent successfully", 
      data: response.data 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    
    const response = await notificationService.getAllNotifications(page);
    
    if (!response.success) {
      return res.status(400).json({ message: response.message });
    }
    
    res.status(200).json({ 
      message: "Notifications retrieved successfully", 
      ...response
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getNotificationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: "UserId is Required" });
    }
    
    const response = await notificationService.getNotificationsByUserId(userId);
    
    if (!response.success) {
      return res.status(400).json({ message: response.message });
    }
    
    res.status(200).json({ 
      message: "User notifications retrieved successfully", 
      data: response.data 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAllNotifications = async (req, res) => {
  try {
    const response = await notificationService.deleteAllNotifications();
    
    if (!response.success) {
      return res.status(400).json({ message: response.message });
    }
    
    res.status(200).json({ 
      message: response.message
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Notification ID is required" });
    }
    
    const response = await notificationService.deleteNotification(id);
    
    if (!response.success) {
      return res.status(404).json({ message: response.message });
    }
    
    res.status(200).json({ 
      message: response.message
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  SendNotification,
  getAllNotifications,
  getNotificationsByUserId,
  deleteAllNotifications,
  deleteNotification
}