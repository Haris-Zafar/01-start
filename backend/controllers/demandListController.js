// demandListController.js
const asyncHandler = require("express-async-handler");
const DemandList = require("../models/demandListModel");
const Supplier = require("../models/supplierModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");

//@desc     Get all demand lists
//@route    GET /api/demandlists
//@access   Private
const getDemandLists = asyncHandler(async (req, res) => {
  const demandLists = await DemandList.find({})
    .populate("supplier", "name")
    .populate("items.product", "name sku");
  res.status(200).json(demandLists);
});

//@desc     Get demand list by ID
//@route    GET /api/demandlists/:id
//@access   Private
const getDemandListById = asyncHandler(async (req, res) => {
  const demandList = await DemandList.findById(req.params.id)
    .populate("supplier", "name contactPerson email phone")
    .populate("items.product", "name sku")
    .populate("items.relatedOrders", "orderNumber");

  if (!demandList) {
    res.status(404);
    throw new Error("Demand list not found");
  }

  res.status(200).json(demandList);
});

//@desc     Create a new demand list
//@route    POST /api/demandlists
//@access   Private
const createDemandList = asyncHandler(async (req, res) => {
  const { supplier, items, notes } = req.body;

  if (!supplier || !items || items.length === 0) {
    res.status(400);
    throw new Error("Please provide supplier and demand list items");
  }

  // Check if supplier exists
  const supplierExists = await Supplier.findById(supplier);
  if (!supplierExists) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  // Validate items and calculate total
  let estimatedTotal = 0;
  const demandItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product with ID ${item.product} not found`);
    }

    // Find supplier-specific purchase price
    const supplierInfo = product.suppliers.find(
      (s) => s.supplier.toString() === supplier
    );

    // Use supplier-specific price if available, otherwise use default purchase price
    const purchasePrice = supplierInfo
      ? supplierInfo.purchasePrice
      : product.purchasePrice;

    demandItems.push({
      product: item.product,
      quantity: item.quantity,
      purchasePrice,
      availableQuantity: 0,
      status: "Pending",
      relatedOrders: item.relatedOrders || [],
    });

    estimatedTotal += purchasePrice * item.quantity;
  }

  const demandList = await DemandList.create({
    supplier,
    demandDate: Date.now(),
    status: "Draft",
    items: demandItems,
    estimatedTotal,
    notes,
  });

  res.status(201).json(demandList);
});

//@desc     Update a demand list
//@route    PUT /api/demandlists/:id
//@access   Private
const updateDemandList = asyncHandler(async (req, res) => {
  const demandList = await DemandList.findById(req.params.id);

  if (!demandList) {
    res.status(404);
    throw new Error("Demand list not found");
  }

  // Don't allow updating fulfilled demand lists
  if (["Fulfilled", "Cancelled"].includes(demandList.status)) {
    res.status(400);
    throw new Error(
      `Cannot update a ${demandList.status.toLowerCase()} demand list`
    );
  }

  const updatedDemandList = await DemandList.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.status(200).json(updatedDemandList);
});

//@desc     Delete a demand list
//@route    DELETE /api/demandlists/:id
//@access   Private
const deleteDemandList = asyncHandler(async (req, res) => {
  const demandList = await DemandList.findById(req.params.id);

  if (!demandList) {
    res.status(404);
    throw new Error("Demand list not found");
  }

  // Only allow deleting draft demand lists
  if (demandList.status !== "Draft") {
    res.status(400);
    throw new Error(
      `Cannot delete a ${demandList.status.toLowerCase()} demand list`
    );
  }

  await demandList.deleteOne();
  res.status(200).json({ id: req.params.id });
});

//@desc     Update demand list status
//@route    PUT /api/demandlists/:id/status
//@access   Private
const updateDemandListStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (
    !status ||
    ![
      "Draft",
      "Submitted",
      "Confirmed",
      "Partial",
      "Fulfilled",
      "Cancelled",
    ].includes(status)
  ) {
    res.status(400);
    throw new Error("Please provide a valid status");
  }

  const demandList = await DemandList.findById(req.params.id);

  if (!demandList) {
    res.status(404);
    throw new Error("Demand list not found");
  }

  demandList.status = status;

  await demandList.save();

  res.status(200).json(demandList);
});

//@desc     Process fulfillment of a demand list
//@route    POST /api/demandlists/:id/fulfill
//@access   Private
const processFulfillment = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error("Please provide items with available quantities");
  }

  const demandList = await DemandList.findById(req.params.id);

  if (!demandList) {
    res.status(404);
    throw new Error("Demand list not found");
  }

  if (!["Submitted", "Confirmed"].includes(demandList.status)) {
    res.status(400);
    throw new Error(
      `Cannot fulfill a ${demandList.status.toLowerCase()} demand list`
    );
  }

  // Update available quantities
  let allFulfilled = true;
  let anyFulfilled = false;

  for (const item of items) {
    const demandItem = demandList.items.find(
      (i) => i.product.toString() === item.product
    );

    if (demandItem) {
      demandItem.availableQuantity = item.availableQuantity;
      demandItem.status =
        item.availableQuantity >= demandItem.quantity
          ? "Available"
          : item.availableQuantity > 0
          ? "Partial"
          : "Unavailable";

      // Update product inventory
      const product = await Product.findById(item.product);
      if (product && item.availableQuantity > 0) {
        product.quantityOnHand += item.availableQuantity;

        // Update supplier purchase history
        const supplierInfo = product.suppliers.find(
          (s) => s.supplier.toString() === demandList.supplier.toString()
        );

        if (supplierInfo) {
          supplierInfo.lastPurchaseDate = Date.now();
        } else {
          product.suppliers.push({
            supplier: demandList.supplier,
            purchasePrice: demandItem.purchasePrice,
            lastPurchaseDate: Date.now(),
          });
        }

        await product.save();
        anyFulfilled = true;
      }

      if (demandItem.status !== "Available") {
        allFulfilled = false;
      }
    }
  }

  // Update order status based on items
  if (allFulfilled) {
    demandList.status = "Fulfilled";
    demandList.fulfillmentDate = Date.now();
  } else if (anyFulfilled) {
    demandList.status = "Partial";
  }

  // Update related orders
  for (const demandItem of demandList.items) {
    if (demandItem.relatedOrders && demandItem.relatedOrders.length > 0) {
      for (const orderId of demandItem.relatedOrders) {
        const order = await Order.findById(orderId);
        if (order) {
          // Check if we can fulfill the order now
          const orderItem = order.items.find(
            (i) => i.product.toString() === demandItem.product.toString()
          );

          if (orderItem && demandItem.availableQuantity > 0) {
            // Determine how much we can fulfill
            const fulfillable = Math.min(
              orderItem.quantity - orderItem.fulfilledQuantity,
              demandItem.availableQuantity
            );

            if (fulfillable > 0) {
              orderItem.fulfilledQuantity += fulfillable;

              // Update order status
              const allItemsFulfilled = order.items.every(
                (item) => item.fulfilledQuantity >= item.quantity
              );

              const anyItemsFulfilled = order.items.some(
                (item) => item.fulfilledQuantity > 0
              );

              if (allItemsFulfilled) {
                order.status = "Fulfilled";
                order.fulfillmentDate = Date.now();
              } else if (anyItemsFulfilled) {
                order.status = "Partial";
              }

              await order.save();
            }
          }
        }
      }
    }
  }

  demandList.updatedAt = Date.now();
  await demandList.save();

  res.status(200).json(demandList);
});

//@desc     Get demand lists by supplier
//@route    GET /api/demandlists/supplier/:supplierId
//@access   Private
const getDemandListsBySupplier = asyncHandler(async (req, res) => {
  const supplierId = req.params.supplierId;

  // Validate supplier exists
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) {
    res.status(404);
    throw new Error("Supplier not found");
  }

  const demandLists = await DemandList.find({ supplier: supplierId })
    .populate("supplier", "name")
    .populate("items.product", "name sku");

  res.status(200).json(demandLists);
});

module.exports = {
  getDemandLists,
  getDemandListById,
  createDemandList,
  updateDemandList,
  deleteDemandList,
  updateDemandListStatus,
  processFulfillment,
  getDemandListsBySupplier,
};
