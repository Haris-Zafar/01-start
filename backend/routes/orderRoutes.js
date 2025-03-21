// orderRoutes.js
const express = require("express");
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  fulfillOrder,
  updateOrderStatus,
  getOrdersByStatus,
  recordPayment,
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getOrders).post(protect, createOrder);

router
  .route("/:id")
  .get(protect, getOrderById)
  .put(protect, updateOrder)
  .delete(protect, deleteOrder);

router.route("/:id/fulfill").put(protect, fulfillOrder);

router.route("/:id/status").put(protect, updateOrderStatus);

router.route("/status/:status").get(protect, getOrdersByStatus);

router.route("/:id/payment").post(protect, recordPayment);

module.exports = router;
