import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import tripRoutes from './routes/trip.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import autenticacaoRoutes from './routes/autenticacao.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API do Sistema de Bilhetes disponível',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/viagens', tripRoutes);
app.use('/api/compras', purchaseRoutes);
app.use('/api/autenticacao', autenticacaoRoutes);

app.use((_req, _res, next) => {
  const error = new Error('Rota não encontrada');
  error.statusCode = 404;
  next(error);
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

export default app;
