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

Representado por `ServicoPagamento` e `ServicoBilhete`, que oferecem operações simples para processos internos mais complexos. Serve para esconder a complexidade da compra e emissão do bilhete.

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

- Pagamento: `PENDENTE`, `APROVADO`, `REJEITADO`;
- Bilhete: `RESERVADO`, `EMITIDO`, `CANCELADO`;
- Viagem: `AGENDADA`, `EM_CURSO`, `CONCLUIDA`, `CANCELADA`.

### Command

Está previsto para operações administrativas como criar, cancelar e emitir. Servirá para transformar cada operação numa ação independente.

## Configuração

```bash
npm install
copy .env.example .env
npm run dev
```

Executar os testes unitários:

```bash
npm test
```

Execute `database/schema.sql` no MySQL antes de iniciar o servidor.

## Endpoints atuais

```text
GET  /api/health
POST /api/autenticacao/registar
POST /api/autenticacao/iniciar-sessao
POST /api/gestao/autocarros
POST /api/gestao/rotas
POST /api/gestao/viagens
GET  /api/viagens/:viagemId/assentos
GET  /api/viagens
GET  /api/viagens/:id
POST /api/compras
GET  /api/compras/ticket/:codigo
```

Exemplo de compra:

```json
{
  "passageiro": { "nome": "Ico Tiago" },
  "viagemId": 1,
  "assento": { "id": 1, "numero": "A1" },
  "metodoPagamento": "MPESA"
}
```
