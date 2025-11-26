const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [100, 'Título muito longo (máx. 100 caracteres)']
  },
  description: {
    type: String,
    required: [true, 'Descrição é obrigatória'],
    trim: true,
    maxlength: [500, 'Descrição muito longa (máx. 500 caracteres)']
  },
  location: {
    type: String,
    required: [true, 'Localização é obrigatória'],
    trim: true,
    maxlength: [100, 'Localização muito longa (máx. 100 caracteres)']
  },
  laboratory: {
    type: String,
    required: [true, 'Laboratório é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome do laboratório muito longo (máx. 100 caracteres)']
  },
  photo: {
    type: String,
    default: null
  },
  datetime: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: {
      values: ['pendente', 'em_manutencao', 'concluido'],
      message: 'Status deve ser: pendente, em_manutencao ou concluido'
    },
    default: 'pendente'
  }
}, {
  timestamps: true
});

equipmentSchema.index({ status: 1 });
equipmentSchema.index({ laboratory: 1 });
equipmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Equipment', equipmentSchema);