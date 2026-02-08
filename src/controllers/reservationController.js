const mongoose = require("mongoose");
const Resource = require("../models/Resource");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parseGuests(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

const createResource = async (req, res) => {
  try {
    const { title, dateTime, guests, notes, type = "reservation" } = req.body || {};

    if (!title || !dateTime || guests === undefined || guests === null) {
      return res.status(400).json({
        message: "Title, dateTime and guests are required",
      });
    }

    const reservationDate = new Date(dateTime);
    if (isNaN(reservationDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const guestsNum = parseGuests(guests);
    if (guestsNum === null || guestsNum < 1) {
      return res.status(400).json({ message: "Guests must be a number >= 1" });
    }

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized (missing userId in token middleware)" });
    }

    const resource = await Resource.create({
      title: String(title).trim(),
      dateTime: reservationDate,
      guests: guestsNum,
      notes: notes ? String(notes) : "",
      type,
      user: req.userId,
    });

    return res.status(201).json({
      message: "Reservation created successfully",
      resource: {
        id: resource._id,
        title: resource.title,
        dateTime: resource.dateTime,
        guests: resource.guests,
        notes: resource.notes,
        type: resource.type,
      },
    });
  } catch (error) {
    console.error("Create resource error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const getAllResources = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const resources = await Resource.find({ user: req.userId })
      .sort({ dateTime: 1 })
      .select("-__v");

    return res.json({
      count: resources.length,
      resources,
    });
  } catch (error) {
    console.error("Get resources error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const getResourceById = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid resource id" });
    }

    const resource = await Resource.findById(id).select("-__v");
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    if (resource.user.toString() !== String(req.userId)) {
      return res.status(403).json({ message: "Forbidden: not your resource" });
    }

    return res.json({ resource });
  } catch (error) {
    console.error("Get resource by ID error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const updateResource = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { title, dateTime, guests, notes } = req.body || {};

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid resource id" });
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    if (resource.user.toString() !== String(req.userId)) {
      return res.status(403).json({ message: "Forbidden: not your resource" });
    }

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) return res.status(400).json({ message: "Title cannot be empty" });
      resource.title = t;
    }

    if (dateTime !== undefined) {
      const newDate = new Date(dateTime);
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      resource.dateTime = newDate;
    }

    if (guests !== undefined) {
      const guestsNum = parseGuests(guests);
      if (guestsNum === null || guestsNum < 1) {
        return res.status(400).json({ message: "Guests must be a number >= 1" });
      }
      resource.guests = guestsNum;
    }

    if (notes !== undefined) {
      resource.notes = notes ? String(notes) : "";
    }

    await resource.save();

    return res.json({
      message: "Resource updated successfully",
      resource: {
        id: resource._id,
        title: resource.title,
        dateTime: resource.dateTime,
        guests: resource.guests,
        notes: resource.notes,
      },
    });
  } catch (error) {
    console.error("Update resource error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const deleteResource = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid resource id" });
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    if (resource.user.toString() !== String(req.userId)) {
      return res.status(403).json({ message: "Forbidden: not your resource" });
    }

    await resource.deleteOne();
    return res.json({ message: "Resource deleted successfully" });
  } catch (error) {
    console.error("Delete resource error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

module.exports = {
  createResource,
  getAllResources,
  getResourceById,
  updateResource,
  deleteResource,
};