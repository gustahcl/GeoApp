const mongoose = require('mongoose');

const PlaceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    photo: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Place', PlaceSchema);
