// productRoutes.js
const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductInventory,
  getProductsBySupplier,
  getProductsByCategory,
  getLowStockProducts,
} = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getProducts).post(protect, createProduct);

router
  .route("/:id")
  .get(protect, getProductById)
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

router.route("/:id/inventory").put(protect, updateProductInventory);

router.route("/supplier/:supplierId").get(protect, getProductsBySupplier);

router.route("/category/:category").get(protect, getProductsByCategory);

router.route("/lowstock").get(protect, getLowStockProducts);

module.exports = router;
