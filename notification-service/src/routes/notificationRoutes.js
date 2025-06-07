const express = require("express");
const { 
  SendNotification,
  getAllNotifications,
  getNotificationsByUserId,
  deleteAllNotifications,
  deleteNotification
} = require("../Controllers/notificationController");

const router = express.Router();

router.post("/send", SendNotification); 
router.get("/all", getAllNotifications);
router.get("/user/:userId", getNotificationsByUserId);
router.delete("/all", deleteAllNotifications);
router.delete("/:id", deleteNotification);

module.exports = router;
