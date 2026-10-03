import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import tripRoutes from './routes/trip.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import autenticacaoRoutes from './routes/autenticacao.routes.js';
import gestaoRoutes from './routes/gestao.routes.js';
import assentoRoutes from './routes/assento.routes.js';
import cancelamentoRoutes from './routes/cancelamento.routes.js';
import contaRoutes from './routes/conta.routes.js';
import suporteRoutes from './routes/suporte.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({
    sucesso: true,
    mensagem: 'API do Sistema de Bilhetes disponível',
    dataHora: new Date().toISOString()
  });
});

app.use('/api/viagens', tripRoutes);
app.use('/api/compras', purchaseRoutes);
app.use('/api/autenticacao', autenticacaoRoutes);
app.use('/api/conta', contaRoutes);
app.use('/api/gestao', gestaoRoutes);
app.use('/api', assentoRoutes);
app.use('/api', cancelamentoRoutes);
app.use('/api/suporte', suporteRoutes);

app.use((_req, _res, next) => {
  const error = new Error('Rota não encontrada');
  error.statusCode = 404;
  next(error);
});

app.use((erro, _req, res, _next) => {
  const codigoEstado = erro.statusCode || 500;
  res.status(codigoEstado).json({
    sucesso: false,
    mensagem: erro.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { detalhes: erro.stack })
  });
});

export default app;
