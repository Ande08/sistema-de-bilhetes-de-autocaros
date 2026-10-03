# Sistema de Bilhetes de Autocarros

Sistema web para consulta de viagens, seleção de assentos, pagamento simulado e emissão de bilhetes eletrónicos.

## Tecnologias

- Backend: Node.js, Express e Sequelize;
- Base de dados: MySQL;
- Frontend: React;
- Linguagem: JavaScript;
- Pagamentos: simulação de M-Pesa, e-Mola e cartão.

## Arquitetura e padrões utilizados

### Arquitetura em camadas

Organiza o sistema em rotas, controladores, serviços, modelos Sequelize e base de dados. Serve para separar responsabilidades, reduzir o acoplamento e facilitar manutenção e testes.

### MVC

É utilizado através dos modelos Sequelize, controladores e rotas. Os modelos representam os dados, os controladores tratam as requisições e as rotas definem os endereços da API. Serve para separar dados, lógica e navegação.

## Padrões criacionais

### Factory Method

Utilizado em `src/factories/payment.factory.js` para criar pagamentos M-Pesa, e-Mola e cartão. Serve para adicionar métodos de pagamento sem alterar diretamente o serviço principal.

### Builder

Utilizado em `src/builders/ticket.builder.js` para construir bilhetes com passageiro, viagem, assento, preço e pagamento. Serve para construir objetos complexos passo a passo.

### Singleton

Utilizado pela instância única do Sequelize exportada em `src/config/database.js`. Serve para manter uma única configuração e ligação à base de dados durante a execução.

### Prototype

Não é utilizado atualmente. Poderá ser usado no futuro para clonar bilhetes ou objetos semelhantes.

### Abstract Factory

Não é utilizado atualmente. Poderá ser usado no futuro para criar famílias de serviços relacionados com diferentes plataformas de pagamento.

## Padrões estruturais

### Facade

Representado por `ServicoCompra`, `ServicoPagamento` e `ServicoBilhete`, que coordenam pesquisa, pagamento, validação do assento e emissão. Serve para esconder dos controllers a complexidade do fluxo de compra.

### Repository

É utilizado através da camada de modelos Sequelize e será expandido para repositórios específicos de viagens, bilhetes e pagamentos. Serve para isolar consultas à base de dados da lógica de negócio.

### Adapter

Está previsto para a integração futura com APIs reais de M-Pesa e e-Mola. Servirá para adaptar interfaces externas ao formato de pagamento do sistema.

## Padrões comportamentais

### Strategy

Aplicado na seleção do método de pagamento. Serve para trocar o comportamento de pagamento sem alterar o fluxo principal da compra.

### Observer

Está previsto para notificações de pagamento aprovado e bilhete emitido. Serve para avisar vários componentes quando ocorre uma alteração importante.

### State

Utilizado nos estados de viagens, pagamentos e bilhetes. Serve para controlar comportamentos de acordo com o estado atual de cada entidade.

- Pagamento: `PENDENTE`, `APROVADO`, `REJEITADO`, `REEMBOLSADO`;
- Bilhete: `RESERVADO`, `EMITIDO`, `CANCELADO`, `UTILIZADO`;
- Viagem: `AGENDADA`, `EM_CURSO`, `CONCLUIDA`, `CANCELADA`.

### Command

Está previsto para operações administrativas como criar, cancelar e emitir. Servirá para transformar cada operação numa ação independente.

### Chain of Responsibility

Utilizado nos middlewares de autenticação, autorização e auditoria em `backend/src/middlewares`. Cada pedido passa por uma sequência de verificações antes de chegar ao controller, permitindo acrescentar segurança e registo sem duplicar essa lógica nas rotas.

## Configuração

```bash
cd backend
npm install
copy .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Executar os testes unitários:

```bash
npm test
```

As migrations Sequelize são a fonte principal da estrutura da base de dados. O ficheiro `backend/database/schema.sql` é mantido apenas como referência histórica.

Comandos da base de dados:

```bash
npm run db:migrate
npm run db:migrate:undo
npm run db:seed
```

Antes de executar os seeders, configure `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`. Defina `CRIAR_DADOS_DEMO=true` apenas quando desejar criar uma viagem de demonstração.

O backend está localizado em `backend/` e o frontend em `frontend/`.

## Endpoints atuais

```text
GET  /api/health
POST /api/autenticacao/registar
POST /api/autenticacao/iniciar-sessao
GET  /api/autenticacao/perfil
PUT  /api/autenticacao/perfil
PUT  /api/autenticacao/palavra-passe
GET  /api/conta/resumo
GET  /api/gestao/painel
POST /api/gestao/autocarros
PATCH /api/gestao/autocarros/:id/estado
POST /api/gestao/rotas
PATCH /api/gestao/rotas/:id/estado
POST /api/gestao/viagens
PUT  /api/gestao/viagens/:id
PATCH /api/gestao/passageiros/:id/estado
GET  /api/viagens/:viagemId/assentos
PATCH /api/bilhetes/:codigo/cancelar
PATCH /api/viagens/:id/cancelar
GET  /api/viagens
GET  /api/viagens/:id
POST /api/compras
GET  /api/compras/bilhete/:codigo
```

Exemplo de compra:

```json
{
  "viagemId": 1,
  "assentoId": 1,
  "metodoPagamento": "MPESA"
}
```

A compra exige autenticação. O nome do passageiro é obtido da conta autenticada, sem recolha de documento pessoal. O backend confirma o pagamento simulado, valida o assento na base de dados e só depois emite o bilhete.
