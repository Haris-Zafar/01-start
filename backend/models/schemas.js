const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Product Schema
const ProductSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  sku: {
    type: String,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  tags: [String],
  companyName: {
    type: String,
    trim: true,
  },
  retailPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  sellPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  quantityOnHand: {
    type: Number,
    default: 0,
    min: 0,
  },
  suppliers: [
    {
      supplier: {
        type: Schema.Types.ObjectId,
        ref: "Supplier",
      },
      purchasePrice: {
        type: Number,
        min: 0,
      },
      isPreferred: {
        type: Boolean,
        default: false,
      },
      lastPurchaseDate: Date,
    },
  ],
  customers: [
    {
      customer: {
        type: Schema.Types.ObjectId,
        ref: "Customer",
      },
      customSellPrice: {
        type: Number,
        min: 0,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Supplier Schema
const SupplierSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  contactPerson: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  reliabilityRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 3,
  },
  products: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
      price: Number,
      availability: {
        type: String,
        enum: ["Always", "Sometimes", "Rarely", "Discontinued"],
        default: "Sometimes",
      },
    },
  ],
  paymentTerms: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Customer Schema
const CustomerSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  storeId: {
    type: String,
    unique: true,
    trim: true,
  },
  contactPerson: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  paymentTerms: String,
  creditLimit: {
    type: Number,
    min: 0,
    default: 0,
  },
  outstandingBalance: {
    type: Number,
    default: 0,
  },
  products: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
      customSellPrice: Number,
    },
  ],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Order Schema
const OrderSchema = new Schema({
  customer: {
    type: Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  orderNumber: {
    type: String,
    unique: true,
    required: true,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Partial", "Fulfilled", "Cancelled"],
    default: "Pending",
  },
  items: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      sellPrice: {
        type: Number,
        required: true,
      },
      fulfilledQuantity: {
        type: Number,
        default: 0,
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Partial", "Paid"],
    default: "Pending",
  },
  paymentHistory: [
    {
      amount: Number,
      date: {
        type: Date,
        default: Date.now,
      },
      method: String,
      reference: String,
    },
  ],
  notes: String,
  fulfillmentDate: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Demand List Schema
const DemandListSchema = new Schema({
  supplier: {
    type: Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  demandDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: [
      "Draft",
      "Submitted",
      "Confirmed",
      "Partial",
      "Fulfilled",
      "Cancelled",
    ],
    default: "Draft",
  },
  items: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      purchasePrice: {
        type: Number,
        required: true,
      },
      availableQuantity: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ["Pending", "Available", "Unavailable", "Partial"],
        default: "Pending",
      },
      relatedOrders: [
        {
          type: Schema.Types.ObjectId,
          ref: "Order",
        },
      ],
    },
  ],
  estimatedTotal: {
    type: Number,
    required: true,
  },
  notes: String,
  fulfillmentDate: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create models
const Product = mongoose.model("Product", ProductSchema);
const Supplier = mongoose.model("Supplier", SupplierSchema);
const Customer = mongoose.model("Customer", CustomerSchema);
const Order = mongoose.model("Order", OrderSchema);
const DemandList = mongoose.model("DemandList", DemandListSchema);

module.exports = {
  Product,
  Supplier,
  Customer,
  Order,
  DemandList,
};
