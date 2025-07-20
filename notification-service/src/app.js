const express = require("express");
const notificationRoutes = require("./routes/notificationRoutes.js");
const cors = require("cors");

const app = express();

app.use(express.json());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.indexOf(origin) !== -1 ||
        !origin
      ) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS Blocked: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

app.get("/", (req, res) => {
  res.send("Notification Service ");
});

app.use("/api/notifications", notificationRoutes);

module.exports = app;
