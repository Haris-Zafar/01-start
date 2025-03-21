// 7. routes/reportRoutes.js (for Phase 4)
const express = require("express");
const router = express.Router();
const {
  getSalesReport,
  getInventoryReport,
  getProductPerformanceReport,
  getCustomerAnalysisReport,
  getSupplierPerformanceReport,
  getRevenueReport,
  getProfitMarginReport,
  getLowStockReport,
  getCustomReport,
} = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

router.route("/sales").get(protect, getSalesReport);

router.route("/inventory").get(protect, getInventoryReport);

router.route("/product-performance").get(protect, getProductPerformanceReport);

router.route("/customer-analysis").get(protect, getCustomerAnalysisReport);

router
  .route("/supplier-performance")
  .get(protect, getSupplierPerformanceReport);

router.route("/revenue").get(protect, getRevenueReport);

router.route("/profit-margin").get(protect, getProfitMarginReport);

router.route("/low-stock").get(protect, getLowStockReport);

router.route("/custom").post(protect, getCustomReport);

module.exports = router;
