import { Bus } from './bus.model.js';
import { Route } from './route.model.js';
import { Trip } from './trip.model.js';
import { User } from './user.model.js';
import { Assento } from './assento.model.js';
import { Bilhete } from './bilhete.model.js';
import { Pagamento } from './pagamento.model.js';
import { Reserva } from './reserva.model.js';
import { Notificacao } from './notificacao.model.js';
import { Auditoria } from './auditoria.model.js';
import { TicketSuporte } from './ticket-suporte.model.js';
import { MensagemSuporte } from './mensagem-suporte.model.js';
import { VerificacaoOtp } from './verificacao-otp.model.js';
import { ConfiguracaoIa } from './configuracao-ia.model.js';
import { EnvioWhatsapp } from './envio-whatsapp.model.js';

// Os relacionamentos ficam centralizados para permitir consultas com include.
Route.hasMany(Trip, { foreignKey: 'routeId' });
Trip.belongsTo(Route, { foreignKey: 'routeId' });
Bus.hasMany(Trip, { foreignKey: 'busId' });
Trip.belongsTo(Bus, { foreignKey: 'busId' });

export { Bus, Route, Trip, User };

Bus.hasMany(Assento, { foreignKey: 'autocarroId' });
Assento.belongsTo(Bus, { foreignKey: 'autocarroId' });
Trip.hasMany(Bilhete, { foreignKey: 'viagemId' });
Bilhete.belongsTo(Trip, { foreignKey: 'viagemId' });
Assento.hasMany(Bilhete, { foreignKey: 'assentoId' });
Bilhete.belongsTo(Assento, { foreignKey: 'assentoId' });
User.hasMany(Bilhete, { foreignKey: 'utilizadorId' });
Bilhete.belongsTo(User, { foreignKey: 'utilizadorId' });
Bilhete.hasOne(Pagamento, { foreignKey: 'bilheteId' });
Pagamento.belongsTo(Bilhete, { foreignKey: 'bilheteId' });
User.hasMany(Reserva, { foreignKey: 'utilizadorId' });
Reserva.belongsTo(User, { foreignKey: 'utilizadorId' });
Trip.hasMany(Reserva, { foreignKey: 'viagemId' });
Reserva.belongsTo(Trip, { foreignKey: 'viagemId' });
Assento.hasMany(Reserva, { foreignKey: 'assentoId' });
Reserva.belongsTo(Assento, { foreignKey: 'assentoId' });
User.hasMany(Notificacao, { foreignKey: 'utilizadorId' });
Notificacao.belongsTo(User, { foreignKey: 'utilizadorId' });
User.hasMany(EnvioWhatsapp, { foreignKey: 'utilizadorId' });
EnvioWhatsapp.belongsTo(User, { foreignKey: 'utilizadorId' });
Trip.hasMany(EnvioWhatsapp, { foreignKey: 'viagemId' });
EnvioWhatsapp.belongsTo(Trip, { foreignKey: 'viagemId' });
User.hasMany(Auditoria, { foreignKey: 'utilizadorId' });
Auditoria.belongsTo(User, { foreignKey: 'utilizadorId' });

// Os aliases distinguem o passageiro que abriu o ticket do gestor responsável.
User.hasMany(TicketSuporte, { as: 'TicketsSuporte', foreignKey: 'utilizadorId' });
TicketSuporte.belongsTo(User, { as: 'Passageiro', foreignKey: 'utilizadorId' });
User.hasMany(TicketSuporte, { as: 'TicketsAtribuidos', foreignKey: 'gestorId' });
TicketSuporte.belongsTo(User, { as: 'Gestor', foreignKey: 'gestorId' });
TicketSuporte.hasMany(MensagemSuporte, { as: 'Mensagens', foreignKey: 'ticketId' });
MensagemSuporte.belongsTo(TicketSuporte, { foreignKey: 'ticketId' });
MensagemSuporte.belongsTo(User, { as: 'Remetente', foreignKey: 'remetenteId' });

export { Assento, Auditoria, Bilhete, ConfiguracaoIa, EnvioWhatsapp, MensagemSuporte, Notificacao, Pagamento, Reserva, TicketSuporte, VerificacaoOtp };
