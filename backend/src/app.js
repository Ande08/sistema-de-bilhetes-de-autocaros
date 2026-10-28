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
import pagamentoSimuladoRoutes from './routes/pagamento-simulado.routes.js';
import cupaoRoutes from './routes/cupao.routes.js';
import atendimentoRoutes from './routes/atendimento.routes.js';
import catalogoRoutes from './routes/catalogo.routes.js';
import { directorioAnexosSuporte } from './services/anexo-suporte.service.js';
import { directorioLogotiposEmpresas } from './services/logotipo-empresa.service.js';

const app = express();

// A aplicação recebe tráfego do Nginx pela interface local. Confiar apenas em
// proxies de loopback permite obter o IP real pelo X-Forwarded-For sem aceitar
// cabeçalhos forjados de clientes que acedam diretamente ao backend.
app.set('trust proxy', 'loopback');

const origensPermitidas = new Set(
  (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean)
);
// Durante o desenvolvimento, Vite pode ser aberto por localhost ou 127.0.0.1.
if (process.env.NODE_ENV !== 'production') {
  origensPermitidas.add('http://localhost:5173');
  origensPermitidas.add('http://127.0.0.1:5173');
}

app.use(helmet());
app.use(cors({
  origin(origem, concluir) {
    if (!origem || origensPermitidas.has(origem)) return concluir(null, true);
    const erro = new Error('A origem desta aplicação não está autorizada.');
    erro.statusCode = 403;
    return concluir(erro);
  }
}));
// O limite comporta imagens de suporte de até 2 MB codificadas em Base64.
app.use(express.json({ limit: '3mb' }));
app.use(morgan('dev'));
app.use('/ficheiros/suporte', express.static(directorioAnexosSuporte, {
  dotfiles: 'deny', index: false,
  setHeaders(resposta) { resposta.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); }
}));
app.use('/ficheiros/empresas', express.static(directorioLogotiposEmpresas, {
  dotfiles: 'deny', index: false,
  setHeaders(resposta) {
    resposta.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    resposta.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

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
app.use('/api/pagamentos-simulados', pagamentoSimuladoRoutes);
app.use('/api/cupons', cupaoRoutes);
app.use('/api/atendimento', atendimentoRoutes);
app.use('/api/catalogo', catalogoRoutes);

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
