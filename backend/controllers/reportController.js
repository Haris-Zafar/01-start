// 7. controllers/reportController.js (for Phase 4)
const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Customer = require("../models/customerModel");
const Supplier = require("../models/supplierModel");
const DemandList = require("../models/demandListModel");

//@desc     Get sales report
//@route    GET /api/reports/sales
//@access   Private
const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Default to last 30 days if no dates provided
  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Set end date to end of day
  end.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    orderDate: { $gte: start, $lte: end },
    status: { $in: ["Fulfilled", "Partial"] },
  })
    .populate("customer", "name")
    .populate("items.product", "name category");

  // Aggregate sales data
  const totalSales = orders.reduce(
    (total, order) => total + order.totalAmount,
    0
  );
  const totalOrders = orders.length;

  // Sales by product
  const salesByProduct = {};
  // Sales by category
  const salesByCategory = {};
  // Sales by customer
  const salesByCustomer = {};
  // Sales by date
  const salesByDate = {};

  orders.forEach((order) => {
    // Format date as YYYY-MM-DD
    const dateKey = order.orderDate.toISOString().split("T")[0];

    // Initialize date entry if not exists
    if (!salesByDate[dateKey]) {
      salesByDate[dateKey] = 0;
    }

    // Add order total to date
    salesByDate[dateKey] += order.totalAmount;

    // Add to customer sales
    const customerName = order.customer ? order.customer.name : "Unknown";
    if (!salesByCustomer[customerName]) {
      salesByCustomer[customerName] = 0;
    }
    salesByCustomer[customerName] += order.totalAmount;

    // Process each item
    order.items.forEach((item) => {
      const productName = item.product ? item.product.name : "Unknown";
      const productCategory = item.product
        ? item.product.category || "Uncategorized"
        : "Uncategorized";
      const itemTotal =
        item.sellPrice * Math.min(item.quantity, item.fulfilledQuantity);

      // Add to product sales
      if (!salesByProduct[productName]) {
        salesByProduct[productName] = {
          total: 0,
          quantity: 0,
          revenue: 0,
        };
      }
      salesByProduct[productName].total += 1;
      salesByProduct[productName].quantity += Math.min(
        item.quantity,
        item.fulfilledQuantity
      );
      salesByProduct[productName].revenue += itemTotal;

      // Add to category sales
      if (!salesByCategory[productCategory]) {
        salesByCategory[productCategory] = {
          total: 0,
          quantity: 0,
          revenue: 0,
        };
      }
      salesByCategory[productCategory].total += 1;
      salesByCategory[productCategory].quantity += Math.min(
        item.quantity,
        item.fulfilledQuantity
      );
      salesByCategory[productCategory].revenue += itemTotal;
    });
  });

  // Convert dates to array for charting
  const salesTimeline = Object.keys(salesByDate)
    .sort()
    .map((date) => ({
      date,
      amount: salesByDate[date],
    }));

  res.status(200).json({
    totalSales,
    totalOrders,
    salesByProduct,
    salesByCategory,
    salesByCustomer,
    salesTimeline,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  });
});

//@desc     Get inventory report
//@route    GET /api/reports/inventory
//@access   Private
const getInventoryReport = asyncHandler(async (req, res) => {
  const products = await Product.find({}).populate(
    "suppliers.supplier",
    "name"
  );

  const inventoryValue = products.reduce((total, product) => {
    return total + product.quantityOnHand * product.purchasePrice;
  }, 0);

  const inventoryByCategory = {};
  const lowStockItems = [];
  const outOfStockItems = [];
  const overstockItems = [];

  // Define thresholds (could be made configurable)
  const lowStockThreshold = 10;
  const overstockThreshold = 100;

  products.forEach((product) => {
    const category = product.category || "Uncategorized";

    // Add to category stats
    if (!inventoryByCategory[category]) {
      inventoryByCategory[category] = {
        count: 0,
        value: 0,
        quantityTotal: 0,
      };
    }

    inventoryByCategory[category].count += 1;
    inventoryByCategory[category].value +=
      product.quantityOnHand * product.purchasePrice;
    inventoryByCategory[category].quantityTotal += product.quantityOnHand;

    // Check stock levels
    if (product.quantityOnHand === 0) {
      outOfStockItems.push({
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
      });
    } else if (product.quantityOnHand <= lowStockThreshold) {
      lowStockItems.push({
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        quantityOnHand: product.quantityOnHand,
      });
    } else if (product.quantityOnHand >= overstockThreshold) {
      overstockItems.push({
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        quantityOnHand: product.quantityOnHand,
        value: product.quantityOnHand * product.purchasePrice,
      });
    }
  });

  res.status(200).json({
    totalProducts: products.length,
    inventoryValue,
    inventoryByCategory,
    lowStockItems,
    outOfStockItems,
    overstockItems,
    stockThresholds: {
      low: lowStockThreshold,
      overstock: overstockThreshold,
    },
  });
});

//@desc     Get product performance report
//@route    GET /api/reports/product-performance
//@access   Private
const getProductPerformanceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Default to last 30 days if no dates provided
  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Set end date to end of day
  end.setHours(23, 59, 59, 999);

  // Get all products
  const products = await Product.find({});

  // Get all orders in date range
  const orders = await Order.find({
    orderDate: { $gte: start, $lte: end },
    status: { $in: ["Fulfilled", "Partial"] },
  }).populate("items.product", "name sku category purchasePrice sellPrice");

  // Performance metrics by product
  const productPerformance = {};

  // Initialize with all products
  products.forEach((product) => {
    productPerformance[product._id] = {
      _id: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category || "Uncategorized",
      quantitySold: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      marginPercentage: 0,
      timesOrdered: 0,
    };
  });

  // Calculate performance from orders
  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.product && productPerformance[item.product._id]) {
        const fulfilledQty = Math.min(item.quantity, item.fulfilledQuantity);
        const revenue = item.sellPrice * fulfilledQty;
        const cost = item.product.purchasePrice * fulfilledQty;
        const profit = revenue - cost;

        productPerformance[item.product._id].quantitySold += fulfilledQty;
        productPerformance[item.product._id].revenue += revenue;
        productPerformance[item.product._id].cost += cost;
        productPerformance[item.product._id].profit += profit;
        productPerformance[item.product._id].timesOrdered += 1;
      }
    });
  });

  // Calculate margin percentages and filter out products without sales
  const performanceArray = Object.values(productPerformance)
    .filter((product) => product.quantitySold > 0)
    .map((product) => {
      product.marginPercentage =
        product.revenue > 0
          ? ((product.profit / product.revenue) * 100).toFixed(2)
          : 0;
      return product;
    })
    .sort((a, b) => b.profit - a.profit); // Sort by profit

  // Get top performers
  const topPerformers = performanceArray.slice(0, 10);

  // Get category performance
  const categoryPerformance = {};

  performanceArray.forEach((product) => {
    const category = product.category;

    if (!categoryPerformance[category]) {
      categoryPerformance[category] = {
        category,
        productCount: 0,
        quantitySold: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        marginPercentage: 0,
      };
    }

    categoryPerformance[category].productCount += 1;
    categoryPerformance[category].quantitySold += product.quantitySold;
    categoryPerformance[category].revenue += product.revenue;
    categoryPerformance[category].cost += product.cost;
    categoryPerformance[category].profit += product.profit;
  });

  // Calculate category margins
  Object.values(categoryPerformance).forEach((category) => {
    category.marginPercentage =
      category.revenue > 0
        ? ((category.profit / category.revenue) * 100).toFixed(2)
        : 0;
  });

  res.status(200).json({
    productPerformance: performanceArray,
    topPerformers,
    categoryPerformance: Object.values(categoryPerformance),
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  });
});

//@desc     Get customer analysis report
//@route    GET /api/reports/customer-analysis
//@access   Private
const getCustomerAnalysisReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Default to last 30 days if no dates provided
  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Set end date to end of day
  end.setHours(23, 59, 59, 999);

  // Get all customers
  const customers = await Customer.find({});

  // Get all orders in date range
  const orders = await Order.find({
    orderDate: { $gte: start, $lte: end },
  }).populate("customer", "name storeId");

  // Customer metrics
  const customerAnalysis = {};

  // Initialize with all customers
  customers.forEach((customer) => {
    customerAnalysis[customer._id] = {
      _id: customer._id,
      name: customer.name,
      storeId: customer.storeId,
      orderCount: 0,
      totalSpent: 0,
      lastOrderDate: null,
      averageOrderValue: 0,
      outstandingBalance: customer.outstandingBalance || 0,
    };
  });

  // Calculate metrics from orders
  orders.forEach((order) => {
    if (order.customer && customerAnalysis[order.customer._id]) {
      customerAnalysis[order.customer._id].orderCount += 1;
      customerAnalysis[order.customer._id].totalSpent += order.totalAmount;

      // Update last order date if newer
      const orderDate = new Date(order.orderDate);
      if (
        !customerAnalysis[order.customer._id].lastOrderDate ||
        orderDate > new Date(customerAnalysis[order.customer._id].lastOrderDate)
      ) {
        customerAnalysis[order.customer._id].lastOrderDate = order.orderDate;
      }
    }
  });

  // Calculate averages and identify customer segments
  const analysisArray = Object.values(customerAnalysis).map((customer) => {
    customer.averageOrderValue =
      customer.orderCount > 0
        ? (customer.totalSpent / customer.orderCount).toFixed(2)
        : 0;

    // Determine recency (days since last order)
    customer.recency = customer.lastOrderDate
      ? Math.round(
          (new Date() - new Date(customer.lastOrderDate)) /
            (24 * 60 * 60 * 1000)
        )
      : null;

    return customer;
  });

  // Top customers by spend
  const topCustomers = [...analysisArray]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  // Most frequent customers
  const mostFrequent = [...analysisArray]
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 10);

  // Customers with highest average order value
  const highestAOV = [...analysisArray]
    .filter((c) => c.orderCount > 0)
    .sort((a, b) => b.averageOrderValue - a.averageOrderValue)
    .slice(0, 10);

  // At-risk customers (ordered before but not recently)
  const atRiskCustomers = analysisArray
    .filter((c) => c.lastOrderDate && c.recency > 60) // No orders in last 60 days
    .sort((a, b) => a.recency - b.recency);

  res.status(200).json({
    customerAnalysis: analysisArray,
    topCustomers,
    mostFrequent,
    highestAOV,
    atRiskCustomers,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  });
});

//@desc     Get supplier performance report
//@route    GET /api/reports/supplier-performance
//@access   Private
const getSupplierPerformanceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Default to last 90 days if no dates provided
  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Set end date to end of day
  end.setHours(23, 59, 59, 999);

  // Get all suppliers
  const suppliers = await Supplier.find({});

  // Get fulfilled demand lists in date range
  const demandLists = await DemandList.find({
    fulfillmentDate: { $gte: start, $lte: end },
    status: { $in: ["Fulfilled", "Partial"] },
  })
    .populate("supplier", "name")
    .populate("items.product", "name");

  // Supplier metrics
  const supplierPerformance = {};

  // Initialize with all suppliers
  suppliers.forEach((supplier) => {
    supplierPerformance[supplier._id] = {
      _id: supplier._id,
      name: supplier.name,
      demandListCount: 0,
      totalPurchased: 0,
      fulfilledPercent: 0,
      itemsRequested: 0,
      itemsFulfilled: 0,
      reliabilityRating: supplier.reliabilityRating || 0,
      lastFulfillmentDate: null,
    };
  });

  // Calculate metrics from demand lists
  demandLists.forEach((demandList) => {
    if (demandList.supplier && supplierPerformance[demandList.supplier._id]) {
      const supplierId = demandList.supplier._id;

      supplierPerformance[supplierId].demandListCount += 1;

      let itemsRequested = 0;
      let itemsFulfilled = 0;
      let totalPurchased = 0;

      demandList.items.forEach((item) => {
        itemsRequested += item.quantity;
        itemsFulfilled += item.availableQuantity;
        totalPurchased += item.availableQuantity * item.purchasePrice;
      });

      supplierPerformance[supplierId].itemsRequested += itemsRequested;
      supplierPerformance[supplierId].itemsFulfilled += itemsFulfilled;
      supplierPerformance[supplierId].totalPurchased += totalPurchased;

      // Update last fulfillment date if newer
      const fulfillmentDate = new Date(demandList.fulfillmentDate);
      if (
        !supplierPerformance[supplierId].lastFulfillmentDate ||
        fulfillmentDate >
          new Date(supplierPerformance[supplierId].lastFulfillmentDate)
      ) {
        supplierPerformance[supplierId].lastFulfillmentDate =
          demandList.fulfillmentDate;
      }
    }
  });

  // Calculate percentages
  const performanceArray = Object.values(supplierPerformance).map(
    (supplier) => {
      supplier.fulfilledPercent =
        supplier.itemsRequested > 0
          ? ((supplier.itemsFulfilled / supplier.itemsRequested) * 100).toFixed(
              2
            )
          : 0;

      return supplier;
    }
  );

  // Top suppliers by purchase amount
  const topSuppliers = [...performanceArray]
    .sort((a, b) => b.totalPurchased - a.totalPurchased)
    .slice(0, 10);

  // Most reliable suppliers
  const mostReliable = [...performanceArray]
    .filter((s) => s.itemsRequested > 0)
    .sort((a, b) => b.fulfilledPercent - a.fulfilledPercent)
    .slice(0, 10);

  res.status(200).json({
    supplierPerformance: performanceArray,
    topSuppliers,
    mostReliable,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  });
});

//@desc     Get revenue report
//@route    GET /api/reports/revenue
//@access   Private
const getRevenueReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  // Default to last 30 days if no dates provided
  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Set end date to end of day
  end.setHours(23, 59, 59, 999);

  // Group by (day, week, month)
  const timeGroup = groupBy || "day";

  // Get all orders in date range
  const orders = await Order.find({
    orderDate: { $gte: start, $lte: end },
    status: { $in: ["Fulfilled", "Partial"] },
  }).populate("items.product", "purchasePrice");

  // Calculate revenue, cost, profit by time period
  const timeData = {};
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;

  orders.forEach((order) => {
    // Get the date in proper format
    const orderDate = new Date(order.orderDate);
    let timeKey;

    switch (timeGroup) {
      case "week":
        // Get the week number
        const firstDayOfYear = new Date(orderDate.getFullYear(), 0, 1);
        const pastDaysOfYear = (orderDate - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil(
          (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
        );
        timeKey = `${orderDate.getFullYear()}-W${weekNum}`;
        break;
      case "month":
        // Format as YYYY-MM
        timeKey = `${orderDate.getFullYear()}-${String(
          orderDate.getMonth() + 1
        ).padStart(2, "0")}`;
        break;
      default: // day
        // Format as YYYY-MM-DD
        timeKey = orderDate.toISOString().split("T")[0];
    }

    if (!timeData[timeKey]) {
      timeData[timeKey] = {
        period: timeKey,
        revenue: 0,
        cost: 0,
        profit: 0,
        orders: 0,
      };
    }

    let orderRevenue = order.totalAmount;
    let orderCost = 0;

    // Calculate cost from items
    order.items.forEach((item) => {
      if (item.product && item.product.purchasePrice) {
        const fulfilledQty = Math.min(item.quantity, item.fulfilledQuantity);
        orderCost += item.product.purchasePrice * fulfilledQty;
      }
    });

    const orderProfit = orderRevenue - orderCost;

    timeData[timeKey].revenue += orderRevenue;
    timeData[timeKey].cost += orderCost;
    timeData[timeKey].profit += orderProfit;
    timeData[timeKey].orders += 1;

    totalRevenue += orderRevenue;
    totalCost += orderCost;
    totalProfit += orderProfit;
  });

  // Convert to array sorted by time period
  const timelineData = Object.values(timeData).sort((a, b) => {
    return a.period.localeCompare(b.period);
  });

  // Calculate profit margins
  const profitMargin =
    totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0;

  res.status(200).json({
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin,
    timelineData,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      groupBy: timeGroup,
    },
  });
});

//@desc     Get demand forecasting report
//@route    GET /api/reports/demand-forecast
//@access   Private
const getDemandForecastReport = asyncHandler(async (req, res) => {
  const { period } = req.query;

  // Default to 30 days forecasting
  const forecastDays = period ? parseInt(period) : 30;

  // Get recent orders to determine trends
  const recentOrders = await Order.find({
    orderDate: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    status: { $in: ["Fulfilled", "Partial"] },
  }).populate("items.product", "name category");

  // Get products and their current inventory levels
  const products = await Product.find({});

  // Calculate product demand based on recent orders
  const productDemand = {};

  products.forEach((product) => {
    productDemand[product._id] = {
      _id: product._id,
      name: product.name,
      category: product.category || "Uncategorized",
      currentStock: product.quantityOnHand,
      averageDailyDemand: 0,
      totalDemand90Days: 0,
      projectedDemand: 0,
      daysUntilStockout: 0,
      recommendedOrder: 0,
    };
  });

  // Calculate demand from recent orders
  recentOrders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.product && productDemand[item.product._id]) {
        const itemDemand = Math.min(item.quantity, item.fulfilledQuantity);
        productDemand[item.product._id].totalDemand90Days += itemDemand;
      }
    });
  });

  // Calculate daily averages and projections
  const demandForecasts = Object.values(productDemand).map((product) => {
    // Calculate average daily demand over the past 90 days
    product.averageDailyDemand = product.totalDemand90Days / 90;

    // Project demand for requested period
    product.projectedDemand = Math.round(
      product.averageDailyDemand * forecastDays
    );

    // Calculate days until stockout based on current inventory
    product.daysUntilStockout =
      product.averageDailyDemand > 0
        ? Math.round(product.currentStock / product.averageDailyDemand)
        : 999; // If no demand, won't stock out

    // Calculate recommended order quantity
    // Order enough to cover projected demand plus a 20% buffer, minus current stock
    const recommendedOrder = Math.round(
      product.projectedDemand * 1.2 - product.currentStock
    );
    product.recommendedOrder = recommendedOrder > 0 ? recommendedOrder : 0;

    return product;
  });

  // Sort products by days until stockout (ascending)
  const atRiskProducts = [...demandForecasts]
    .filter((p) => p.averageDailyDemand > 0) // Only include products with some demand
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
    .slice(0, 20);

  // Group forecasts by category
  const categoryForecasts = {};

  demandForecasts.forEach((product) => {
    const category = product.category;

    if (!categoryForecasts[category]) {
      categoryForecasts[category] = {
        category,
        totalProjectedDemand: 0,
        totalCurrentStock: 0,
        avgDaysUntilStockout: 0,
        productCount: 0,
      };
    }

    categoryForecasts[category].totalProjectedDemand += product.projectedDemand;
    categoryForecasts[category].totalCurrentStock += product.currentStock;
    categoryForecasts[category].avgDaysUntilStockout +=
      product.daysUntilStockout;
    categoryForecasts[category].productCount += 1;
  });

  // Calculate category averages
  Object.values(categoryForecasts).forEach((category) => {
    category.avgDaysUntilStockout =
      category.productCount > 0
        ? Math.round(category.avgDaysUntilStockout / category.productCount)
        : 0;
  });

  res.status(200).json({
    forecastPeriod: forecastDays,
    productForecasts: demandForecasts,
    atRiskProducts,
    categoryForecasts: Object.values(categoryForecasts),
  });
});

//@desc     Get profit margin report
//@route    GET /api/reports/profit-margins
//@access   Private
const getProfitMarginReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Default to last 30 days if no dates provided
  const start = startDate
    ? new Date(startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Set end date to end of day
  end.setHours(23, 59, 59, 999);

  // Get fulfilled or partially fulfilled orders in date range
  const orders = await Order.find({
    orderDate: { $gte: start, $lte: end },
    status: { $in: ["Fulfilled", "Partial"] },
  }).populate("items.product", "name category purchasePrice");

  // Calculate overall margins
  let totalRevenue = 0;
  let totalCost = 0;

  // Margin by product
  const productMargins = {};

  // Margin by category
  const categoryMargins = {};

  // Process orders
  orders.forEach((order) => {
    order.items.forEach((item) => {
      if (item.product) {
        const fulfilledQty = Math.min(item.quantity, item.fulfilledQuantity);
        const revenue = item.sellPrice * fulfilledQty;
        const cost = item.product.purchasePrice * fulfilledQty;
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        totalRevenue += revenue;
        totalCost += cost;

        // Add to product margins
        const productId = item.product._id.toString();
        const productName = item.product.name;
        const productCategory = item.product.category || "Uncategorized";

        if (!productMargins[productId]) {
          productMargins[productId] = {
            _id: productId,
            name: productName,
            category: productCategory,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
            units: 0,
          };
        }

        productMargins[productId].revenue += revenue;
        productMargins[productId].cost += cost;
        productMargins[productId].profit += profit;
        productMargins[productId].units += fulfilledQty;

        // Add to category margins
        if (!categoryMargins[productCategory]) {
          categoryMargins[productCategory] = {
            category: productCategory,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0,
            units: 0,
          };
        }

        categoryMargins[productCategory].revenue += revenue;
        categoryMargins[productCategory].cost += cost;
        categoryMargins[productCategory].profit += profit;
        categoryMargins[productCategory].units += fulfilledQty;
      }
    });
  });

  // Calculate final margins
  const totalProfit = totalRevenue - totalCost;
  const overallMargin =
    totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0;

  // Calculate product margins
  const productMarginsArray = Object.values(productMargins)
    .map((product) => {
      product.margin =
        product.revenue > 0
          ? ((product.profit / product.revenue) * 100).toFixed(2)
          : 0;
      return product;
    })
    .sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin));

  // Calculate category margins
  const categoryMarginsArray = Object.values(categoryMargins)
    .map((category) => {
      category.margin =
        category.revenue > 0
          ? ((category.profit / category.revenue) * 100).toFixed(2)
          : 0;
      return category;
    })
    .sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin));

  // Top margin products/categories
  const topMarginProducts = productMarginsArray.slice(0, 10);
  const bottomMarginProducts = [...productMarginsArray].reverse().slice(0, 10);

  res.status(200).json({
    totalRevenue,
    totalCost,
    totalProfit,
    overallMargin,
    productMargins: productMarginsArray,
    categoryMargins: categoryMarginsArray,
    topMarginProducts,
    bottomMarginProducts,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  });
});

module.exports = {
  getSalesReport,
  getInventoryReport,
  getProductPerformanceReport,
  getCustomerAnalysisReport,
  getSupplierPerformanceReport,
  getRevenueReport,
  getDemandForecastReport,
  getProfitMarginReport,
};
