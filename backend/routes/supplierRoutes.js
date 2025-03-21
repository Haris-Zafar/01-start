// supplierRoutes.js
const express = require("express");
const router = express.Router();
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  updateSupplierReliability,
} = require("../controllers/supplierController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getSuppliers).post(protect, createSupplier);

router
  .route("/:id")
  .get(protect, getSupplierById)
  .put(protect, updateSupplier)
  .delete(protect, deleteSupplier);

router.route("/:id/products").get(protect, getSupplierProducts);

router.route("/:id/reliability").put(protect, updateSupplierReliability);

module.exports = router;
