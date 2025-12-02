require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const Equipment = require('./models/Equipment');

const app = express();
const PORT = 3000;
const HOST = '192.168.1.9';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/equipment-reports';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Equipment Reports API',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Sistema de reporte de equipamentos funcionando',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
  });
});

app.get('/api/equipments', async (req, res) => {
  try {
    const equipments = await Equipment.find().sort({ createdAt: -1 });
    res.json(equipments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar equipamentos' });
  }
});

app.post('/api/equipments', upload.single('photo'), async (req, res) => {
  try {
    const { title, description, location, laboratory, datetime } = req.body;

    if (!title || !description || !location || !laboratory) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: title, description, location, laboratory' 
      });
    }

    const equipment = new Equipment({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      laboratory: laboratory.trim(),
      datetime: datetime || new Date(),
      photo: req.file ? req.file.filename : null,
      status: 'pendente'
    });

    await equipment.save();
    
    res.status(201).json({
      message: 'Equipamento reportado com sucesso!',
      equipment: equipment
    });
  } catch (err) {
    console.error('Erro detalhado:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Dados de entrada inválidos', 
        details: err.errors 
      });
    }
    
    res.status(500).json({ 
      error: 'Erro interno ao salvar equipamento'
    });
  }
});

app.put('/api/equipments/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pendente', 'em_manutencao', 'concluido'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status inválido. Use: pendente, em_manutencao ou concluido' 
      });
    }

    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!equipment) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    res.json({
      message: 'Status atualizado com sucesso!',
      equipment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar equipamento' });
  }
});

app.delete('/api/equipments/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    
    if (!equipment) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    res.json({ 
      message: 'Equipamento excluído com sucesso!',
      deletedEquipment: equipment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir equipamento' });
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 5MB' });
    }
  }
  
  console.error('Erro não tratado:', error);
  res.status(500).json({ 
    error: 'Erro interno do servidor'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.originalUrl 
  });
});

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB conectado com sucesso');
    
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Diretório de uploads criado');
    }
    
    app.listen(PORT, HOST, () => {
      console.log(`Servidor rodando!`);
      console.log(`Local: http://localhost:${PORT}`);
      console.log(`Rede: http://${HOST}:${PORT}`);
      console.log(` Health: http://${HOST}:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.error('Erro ao conectar no MongoDB', err);
    process.exit(1);
  });
