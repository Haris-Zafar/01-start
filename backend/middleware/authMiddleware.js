// const jwt = require("jsonwebtoken");
// const asyncHandler = require("express-async-handler");
// const User = require("../models/userModel");

// const protect = asyncHandler(async (req, res, next) => {
//   let token;

//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     try {
//       // get token from headers
//       token = req.headers.authorization.split(" ")[1];

//       //verify token
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);

//       // get user from token
//       req.user = await User.findById(decoded.id).select("-password");
//       next();
//     } catch (error) {
//       console.log(error);
//       res.status(401);
//       throw new Error("Not Authorized");
//     }
//   }
//   if (!token) {
//     res.status(401);
//     throw new Error("Not Authorized, no token");
//   }
// });

// module.exports = { protect };

// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");

/**
 * Middleware to protect routes - verifies JWT token
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header (remove "Bearer" part)
      token = req.headers.authorization.split(" ")[1];

      // Verify token and get user id
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (exclude password)
      req.user = await User.findById(decoded.id).select("-password");

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }
});

/**
 * Middleware to restrict routes to admin users only
 */
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as an admin");
  }
};

/**
 * Middleware to check specific permissions
 * @param {string} permission - Required permission
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (
      req.user &&
      (req.user.role === "admin" || req.user.permissions.includes(permission))
    ) {
      next();
    } else {
      res.status(403);
      throw new Error(`Permission denied: ${permission} required`);
    }
  };
};

module.exports = { protect, admin, checkPermission };
