// orderController.js
const asyncHandler = require("express-async-handler");
const Order = require("../models/orderModel");
const Customer = require("../models/customerModel");
const Product = require("../models/productModel");

//@desc     Get all orders
//@route    GET /api/orders
//@access   Private
const getOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate("customer", "name storeId")
    .populate("items.product", "name sku");
  res.status(200).json(orders);
});

//@desc     Get order by ID
//@route    GET /api/orders/:id
//@access   Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("customer", "name storeId contactPerson email phone")
    .populate("items.product", "name sku retailPrice");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  res.status(200).json(order);
});

//@desc     Create a new order
//@route    POST /api/orders
//@access   Private
const createOrder = asyncHandler(async (req, res) => {
  const { customer, items, notes } = req.body;

  if (!customer || !items || items.length === 0) {
    res.status(400);
    throw new Error("Please provide customer and order items");
  }

  // Check if customer exists
  const customerExists = await Customer.findById(customer);
  if (!customerExists) {
    res.status(404);
    throw new Error("Customer not found");
  }

  // Validate items and calculate total
  let totalAmount = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product with ID ${item.product} not found`);
    }

    // Check if this customer has a custom price
    const customerPricing = product.customers.find(
      (c) => c.customer.toString() === customer
    );

    // Use custom price if available, otherwise use default sell price
    const sellPrice = customerPricing
      ? customerPricing.customSellPrice
      : product.sellPrice;

    orderItems.push({
      product: item.product,
      quantity: item.quantity,
      sellPrice,
      fulfilledQuantity: 0,
    });

    totalAmount += sellPrice * item.quantity;
  }

  // Generate order number
  const orderCount = await Order.countDocuments();
  const orderNumber = `ORD-${new Date().getFullYear()}${(orderCount + 1)
    .toString()
    .padStart(4, "0")}`;

  const order = await Order.create({
    customer,
    orderNumber,
    orderDate: Date.now(),
    status: "Pending",
    items: orderItems,
    totalAmount,
    paymentStatus: "Pending",
    notes,
  });

  // Update customer outstanding balance
  customerExists.outstandingBalance += totalAmount;
  await customerExists.save();

  res.status(201).json(order);
});

//@desc     Update an order
//@route    PUT /api/orders/:id
//@access   Private
const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Don't allow updating fulfilled orders
  if (order.status === "Fulfilled" || order.status === "Cancelled") {
    res.status(400);
    throw new Error(`Cannot update a ${order.status.toLowerCase()} order`);
  }

  const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.status(200).json(updatedOrder);
});

//@desc     Delete an order
//@route    DELETE /api/orders/:id
//@access   Private
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only allow deleting pending orders
  if (order.status !== "Pending") {
    res.status(400);
    throw new Error(`Cannot delete a ${order.status.toLowerCase()} order`);
  }

  // Update customer outstanding balance
  const customer = await Customer.findById(order.customer);
  if (customer) {
    customer.outstandingBalance -= order.totalAmount;
    await customer.save();
  }

  await order.deleteOne();
  res.status(200).json({ id: req.params.id });
});

//@desc     Fulfill an order
//@route    PUT /api/orders/:id/fulfill
//@access   Private
const fulfillOrder = asyncHandler(async (req, res) => {
  const { items } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.status === "Fulfilled" || order.status === "Cancelled") {
    res.status(400);
    throw new Error(`Cannot fulfill a ${order.status.toLowerCase()} order`);
  }

  // Update fulfilled quantities
  let allFulfilled = true;

  if (items && items.length > 0) {
    for (const item of items) {
      const orderItem = order.items.find(
        (i) => i.product.toString() === item.product
      );

      if (orderItem) {
        orderItem.fulfilledQuantity = item.fulfilledQuantity;

        // Reduce inventory
        const product = await Product.findById(item.product);
        if (product) {
          const quantityToReduce =
            item.fulfilledQuantity - (orderItem.fulfilledQuantity || 0);
          product.quantityOnHand = Math.max(
            0,
            product.quantityOnHand - quantityToReduce
          );
          await product.save();
        }

        if (orderItem.fulfilledQuantity < orderItem.quantity) {
          allFulfilled = false;
        }
      }
    }
  }

  // Update order status based on fulfillment
  order.status = allFulfilled ? "Fulfilled" : "Partial";
  order.fulfillmentDate = allFulfilled ? Date.now() : undefined;

  await order.save();

  res.status(200).json(order);
});

//@desc     Update order status
//@route    PUT /api/orders/:id/status
//@access   Private
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (
    !status ||
    !["Pending", "Processing", "Partial", "Fulfilled", "Cancelled"].includes(
      status
    )
  ) {
    res.status(400);
    throw new Error("Please provide a valid status");
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.status = status;

  if (status === "Fulfilled") {
    order.fulfillmentDate = Date.now();
  } else if (status === "Cancelled") {
    // Return inventory for fulfilled items
    for (const item of order.items) {
      if (item.fulfilledQuantity > 0) {
        const product = await Product.findById(item.product);
        if (product) {
          product.quantityOnHand += item.fulfilledQuantity;
          await product.save();
        }
      }
    }

    // Update customer outstanding balance
    const customer = await Customer.findById(order.customer);
    if (customer) {
      customer.outstandingBalance -= order.totalAmount;
      await customer.save();
    }
  }

  await order.save();

  res.status(200).json(order);
});

//@desc     Get orders by status
//@route    GET /api/orders/status/:status
//@access   Private
const getOrdersByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;

  if (
    !["Pending", "Processing", "Partial", "Fulfilled", "Cancelled"].includes(
      status
    )
  ) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const orders = await Order.find({ status })
    .populate("customer", "name storeId")
    .populate("items.product", "name sku");

  res.status(200).json(orders);
});

//@desc     Record payment for order
//@route    POST /api/orders/:id/payment
//@access   Private
const recordPayment = asyncHandler(async (req, res) => {
  const { amount, method, reference } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error("Please provide a valid payment amount");
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Calculate total paid so far
  const totalPaid =
    order.paymentHistory.reduce((sum, payment) => sum + payment.amount, 0) +
    amount;

  // Add payment to history
  order.paymentHistory.push({
    amount,
    date: Date.now(),
    method: method || "Cash",
    reference,
  });

  // Update payment status
  if (totalPaid >= order.totalAmount) {
    order.paymentStatus = "Paid";
  } else {
    order.paymentStatus = "Partial";
  }

  await order.save();

  // Update customer outstanding balance
  const customer = await Customer.findById(order.customer);
  if (customer) {
    customer.outstandingBalance -= amount;
    await customer.save();
  }

  res.status(200).json(order);
});

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  fulfillOrder,
  updateOrderStatus,
  getOrdersByStatus,
  recordPayment,
};
