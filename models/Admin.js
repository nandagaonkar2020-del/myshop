const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const AdminSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
