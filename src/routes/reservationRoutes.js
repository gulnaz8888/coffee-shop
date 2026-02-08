const express = require("express");
const router = express.Router();
const { 
  createResource, 
  getAllResources, 
  getResourceById, 
  updateResource, 
  deleteResource 
} = require("../controllers/reservationController");
const { verifyToken } = require("../middleware/authMiddleware");

router.use(verifyToken);

router.post("/", createResource);

router.get("/", getAllResources);

router.get("/:id", getResourceById);

router.put("/:id", updateResource);

router.delete("/:id", deleteResource);

module.exports = router;