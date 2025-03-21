// const express = require("express");
// const router = express.Router();
// const {
//   registerUser,
//   loginUser,
//   getMe,
// } = require("../controllers/userController");
// const { protect } = require("../middleware/authMiddleware");

// router.post("/", registerUser);
// router.post("/login", loginUser);
// router.get("/me", protect, getMe);

// module.exports = router;

// 6. routes/userRoutes.js (for Phase 5)
const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  deleteUser,
  updateUser,
  updateUserPermissions,
} = require("../controllers/userController");
const { protect, admin } = require("../middleware/authMiddleware");

router.route("/").post(registerUser).get(protect, admin, getUsers);

router.post("/login", loginUser);

router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router
  .route("/:id")
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

router.route("/:id/permissions").put(protect, admin, updateUserPermissions);

module.exports = router;
