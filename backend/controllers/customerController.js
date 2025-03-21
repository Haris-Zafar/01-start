// customerController.js
const asyncHandler = require("express-async-handler");
const Customer = require("../models/customerModel");
const Order = require("../models/orderModel");

//@desc     Get all customers
//@route    GET /api/customers
//@access   Private
const getCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find({});
  res.status(200).json(customers);
});

//@desc     Get customer by ID
//@route    GET /api/customers/:id
//@access   Private
const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  res.status(200).json(customer);
});

//@desc     Create a new customer
//@route    POST /api/customers
//@access   Private
const createCustomer = asyncHandler(async (req, res) => {
  const {
    name,
    storeId,
    contactPerson,
    email,
    phone,
    address,
    paymentTerms,
    creditLimit,
  } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Please provide customer name");
  }

  if (storeId) {
    const customerExists = await Customer.findOne({ storeId });
    if (customerExists) {
      res.status(400);
      throw new Error("Customer with this Store ID already exists");
    }
  }

  const customer = await Customer.create({
    name,
    storeId,
    contactPerson,
    email,
    phone,
    address,
    paymentTerms,
    creditLimit: creditLimit || 0,
    outstandingBalance: 0,
  });

  res.status(201).json(customer);
});

//@desc     Update a customer
//@route    PUT /api/customers/:id
//@access   Private
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  const updatedCustomer = await Customer.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json(updatedCustomer);
});

//@desc     Delete a customer
//@route    DELETE /api/customers/:id
//@access   Private
const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  // Check if customer has orders
  const hasOrders = await Order.exists({ customer: req.params.id });
  if (hasOrders) {
    res.status(400);
    throw new Error("Cannot delete customer with existing orders");
  }

  await customer.deleteOne();
  res.status(200).json({ id: req.params.id });
});

//@desc     Get customer orders
//@route    GET /api/customers/:id/orders
//@access   Private
const getCustomerOrders = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  const orders = await Order.find({ customer: req.params.id });

  res.status(200).json(orders);
});

//@desc     Update customer balance
//@route    PUT /api/customers/:id/balance
//@access   Private
const updateCustomerBalance = asyncHandler(async (req, res) => {
  const { outstandingBalance } = req.body;

  if (outstandingBalance === undefined) {
    res.status(400);
    throw new Error("Please provide outstandingBalance");
  }

  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    res.status(404);
    throw new Error("Customer not found");
  }

  customer.outstandingBalance = outstandingBalance;
  customer.updatedAt = Date.now();

  await customer.save();

  res.status(200).json(customer);
});

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrders,
  updateCustomerBalance,
};
