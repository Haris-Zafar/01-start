// demandListRoutes.js
const express = require("express");
const router = express.Router();
const {
  getDemandLists,
  getDemandListById,
  createDemandList,
  updateDemandList,
  deleteDemandList,
  updateDemandListStatus,
  processFulfillment,
  getDemandListsBySupplier,
} = require("../controllers/demandListController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getDemandLists).post(protect, createDemandList);

router
  .route("/:id")
  .get(protect, getDemandListById)
  .put(protect, updateDemandList)
  .delete(protect, deleteDemandList);

router.route("/:id/status").put(protect, updateDemandListStatus);

router.route("/:id/fulfill").post(protect, processFulfillment);

router.route("/supplier/:supplierId").get(protect, getDemandListsBySupplier);

module.exports = router;
