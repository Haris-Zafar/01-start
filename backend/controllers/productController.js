// productController.js
const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");

//@desc     Get all products
//@route    GET /api/products
//@access   Private
const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({});
  res.status(200).json(products);
});

//@desc     Get product by ID
//@route    GET /api/products/:id
//@access   Private
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.status(200).json(product);
});

//@desc     Create a new product
//@route    POST /api/products
//@access   Private
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    sku,
    category,
    companyName,
    retailPrice,
    purchasePrice,
    sellPrice,
    quantityOnHand,
    suppliers,
  } = req.body;

  if (!name || !retailPrice || !purchasePrice || !sellPrice) {
    res.status(400);
    throw new Error("Please provide all required fields");
  }

  const productExists = await Product.findOne({ sku });
  if (productExists && sku) {
    res.status(400);
    throw new Error("Product with this SKU already exists");
  }

  const product = await Product.create({
    name,
    description,
    sku,
    category,
    companyName,
    retailPrice,
    purchasePrice,
    sellPrice,
    quantityOnHand,
    suppliers,
  });

  res.status(201).json(product);
});

//@desc     Update a product
//@route    PUT /api/products/:id
//@access   Private
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json(updatedProduct);
});

//@desc     Delete a product
//@route    DELETE /api/products/:id
//@access   Private
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  await product.deleteOne();
  res.status(200).json({ id: req.params.id });
});

//@desc     Update product inventory
//@route    PUT /api/products/:id/inventory
//@access   Private
const updateProductInventory = asyncHandler(async (req, res) => {
  const { quantityOnHand } = req.body;

  if (quantityOnHand === undefined) {
    res.status(400);
    throw new Error("Please provide quantityOnHand");
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  product.quantityOnHand = quantityOnHand;
  product.updatedAt = Date.now();

  await product.save();

  res.status(200).json(product);
});

//@desc     Get products by supplier
//@route    GET /api/products/supplier/:supplierId
//@access   Private
const getProductsBySupplier = asyncHandler(async (req, res) => {
  const products = await Product.find({
    "suppliers.supplier": req.params.supplierId,
  });

  res.status(200).json(products);
});

//@desc     Get products by category
//@route    GET /api/products/category/:category
//@access   Private
const getProductsByCategory = asyncHandler(async (req, res) => {
  const products = await Product.find({
    category: req.params.category,
  });

  res.status(200).json(products);
});

//@desc     Get low stock products
//@route    GET /api/products/lowstock
//@access   Private
const getLowStockProducts = asyncHandler(async (req, res) => {
  // Assuming low stock threshold is set at 10 units, could be made configurable
  const products = await Product.find({
    quantityOnHand: { $lt: 10 },
  });

  res.status(200).json(products);
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductInventory,
  getProductsBySupplier,
  getProductsByCategory,
  getLowStockProducts,
};
