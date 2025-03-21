// supplierController.js
const asyncHandler = require("express-async-handler");
const Supplier = require("../models/supplierModel");
const Product = require("../models/productModel");

//@desc     Get all suppliers
//@route    GET /api/suppliers
//@access   Private
const getSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find({});
  res.status(200).json(suppliers);
});

//@desc     Get supplier by ID
//@route    GET /api/suppliers/:id
//@access   Private
const getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  res.status(200).json(supplier);
});

//@desc     Create a new supplier
//@route    POST /api/suppliers
//@access   Private
const createSupplier = asyncHandler(async (req, res) => {
  const { name, contactPerson, email, phone, address, paymentTerms, notes } =
    req.body;

  if (!name) {
    res.status(400);
    throw new Error("Please provide supplier name");
  }

  const supplier = await Supplier.create({
    name,
    contactPerson,
    email,
    phone,
    address,
    paymentTerms,
    notes,
  });

  res.status(201).json(supplier);
});

//@desc     Update a supplier
//@route    PUT /api/suppliers/:id
//@access   Private
const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  const updatedSupplier = await Supplier.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json(updatedSupplier);
});

//@desc     Delete a supplier
//@route    DELETE /api/suppliers/:id
//@access   Private
const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  // Check if supplier has linked products
  const hasProducts = await Product.exists({
    "suppliers.supplier": req.params.id,
  });
  if (hasProducts) {
    res.status(400);
    throw new Error("Cannot delete supplier with linked products");
  }

  await supplier.deleteOne();
  res.status(200).json({ id: req.params.id });
});

//@desc     Get supplier products
//@route    GET /api/suppliers/:id/products
//@access   Private
const getSupplierProducts = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  // Get products where this supplier is listed
  const products = await Product.find({ "suppliers.supplier": req.params.id });

  res.status(200).json(products);
});

//@desc     Update supplier reliability rating
//@route    PUT /api/suppliers/:id/reliability
//@access   Private
const updateSupplierReliability = asyncHandler(async (req, res) => {
  const { reliabilityRating } = req.body;

  if (
    reliabilityRating === undefined ||
    reliabilityRating < 0 ||
    reliabilityRating > 5
  ) {
    res.status(400);
    throw new Error("Please provide a valid reliability rating (0-5)");
  }

  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  supplier.reliabilityRating = reliabilityRating;
  supplier.updatedAt = Date.now();

  await supplier.save();

  res.status(200).json(supplier);
});

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  updateSupplierReliability,
};
