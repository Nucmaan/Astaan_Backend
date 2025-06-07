const jwt = require("jsonwebtoken");
const { User } = require("../model/User.js");

const authMiddleware = async (req, res, next) => {
  try {
    let accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      req.user = { id: decoded.id, role: decoded.role };
      return next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return refreshTokenMiddleware(req, res, next);
      }
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
};

const refreshTokenMiddleware = async (req, res, next) => {
  try {
    let refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(403).json({ message: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "role"],
    });

    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: "Strict",
      expires: new Date(Date.now() + 15 * 60 * 1000),
    });

    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    console.error("Refresh Token Middleware Error:", error);
    return res
      .status(403)
      .json({ message: "Invalid refresh token, please login again" });
  }
};

module.exports = {
  authMiddleware,
  refreshTokenMiddleware,
};
