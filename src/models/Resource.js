const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    title: { type: String, required: true },
    dateTime: { type: Date, required: true },
    guests: { type: Number, required: true, min: 1 },
    notes: String,
    type: { type: String, default: 'reservation' },
     user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  }, { timestamps: true });

module.exports = mongoose.model('Reservation', reservationSchema);