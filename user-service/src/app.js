require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const compression = require('compression');
const helmet = require('helmet');

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

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
});

//app.use(limiter)

app.use(compression());
app.use(helmet());

app.use(express.json());
app.use(cookieParser());

app.use(express.urlencoded({ limit: "10mb", extended: true }));

const authRoutes = require("./Routes/User.js");

app.use("/api/auth/", authRoutes);

module.exports = app;
