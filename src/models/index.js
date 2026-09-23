import { Bus } from './bus.model.js';
import { Route } from './route.model.js';
import { Trip } from './trip.model.js';
import { User } from './user.model.js';
import { Assento } from './assento.model.js';
import { Bilhete } from './bilhete.model.js';
import { Pagamento } from './pagamento.model.js';

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
Bilhete.hasOne(Pagamento, { foreignKey: 'bilheteId' });
Pagamento.belongsTo(Bilhete, { foreignKey: 'bilheteId' });

export { Assento, Bilhete, Pagamento };
