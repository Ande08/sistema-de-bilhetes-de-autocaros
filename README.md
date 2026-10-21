# Sistema de Bilhetes de Autocarros

Sistema web para consulta de viagens, seleção de assentos, pagamento simulado, emissão de bilhetes eletrónicos e suporte ao passageiro em tempo real.

O cadastro de passageiros utiliza nome, apelido e número de telefone. A conta só é criada depois da confirmação de um código OTP enviado por WhatsApp ou SMS. Em desenvolvimento, o envio é simulado e o código aparece na tela para permitir testes sem um fornecedor externo.

## Tecnologias

- Backend: Node.js, Express e Sequelize;
- Base de dados: MySQL;
- Frontend: React;
- Comunicação em tempo real: Socket.IO;
- Envio de OTP por WhatsApp: Baileys com sessão de dispositivo ligado;
- Linguagem: JavaScript;
- Pagamentos: APIs falsas de M-Pesa, e-Mola e cartão, com transação pendente, processamento visual e aprovação simulada.

## Arquitetura e padrões utilizados

### Arquitetura em camadas

Organiza o sistema em rotas, controladores, serviços, modelos Sequelize e base de dados. Serve para separar responsabilidades, reduzir o acoplamento e facilitar manutenção e testes.

### MVC

É utilizado através dos modelos Sequelize, controladores e rotas. Os modelos representam os dados, os controladores tratam as requisições e as rotas definem os endereços da API. Serve para separar dados, lógica e navegação.

## Padrões criacionais

### Factory Method

Utilizado em `src/factories/payment.factory.js` para criar pagamentos M-Pesa, e-Mola e cartão. Serve para adicionar métodos de pagamento sem alterar diretamente o serviço principal. O ciclo académico das APIs falsas é coordenado por `backend/src/services/gateway-pagamento-simulado.service.js`: a transação começa como `PENDENTE`, é processada pelo serviço falso, passa a `APROVADO` e a referência só pode ser usada uma vez na emissão do bilhete.

### Builder

Utilizado em `src/builders/ticket.builder.js` para construir bilhetes com passageiro, viagem, assento, preço e pagamento. Serve para construir objetos complexos passo a passo.

### Singleton

Utilizado pela instância única do Sequelize exportada em `src/config/database.js` e pela instância `servicoWhatsApp` em `backend/src/integrations/whatsapp/whatsapp.service.js`. Serve para manter uma única ligação à base de dados e uma única sessão WhatsApp durante a execução.

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

Utilizado em `backend/src/adapters/otp.adapter.js` para isolar o envio de códigos OTP. Estão disponíveis o fornecedor simulado e `WHATSAPP_BAILEYS`; uma API oficial de WhatsApp ou SMS pode ser adicionada sem alterar o serviço de cadastro. O mesmo padrão está previsto para integrações reais de M-Pesa e e-Mola.

## Padrões comportamentais

### Strategy

Aplicado na seleção do método de pagamento. Serve para trocar o comportamento de pagamento sem alterar o fluxo principal da compra.

### Observer

Utilizado no chat de suporte através do Socket.IO. Quando uma mensagem ou o estado de um ticket muda, o servidor publica o evento para todos os participantes autorizados na sala desse ticket. Serve para atualizar passageiro, gestor e administrador em tempo real sem consultas repetitivas.

### State

Utilizado nos estados de viagens, pagamentos e bilhetes. Serve para controlar comportamentos de acordo com o estado atual de cada entidade.

- Pagamento: `PENDENTE`, `APROVADO`, `REJEITADO`, `REEMBOLSADO`;
- Bilhete: `RESERVADO`, `EMITIDO`, `CANCELADO`, `UTILIZADO`;
- Viagem: `AGENDADA`, `EM_CURSO`, `CONCLUIDA`, `CANCELADA`.
- Ticket de suporte: `ABERTO`, `EM_ATENDIMENTO`, `AGUARDA_UTILIZADOR`, `RESOLVIDO`, `ENCERRADO`.

### Command

Está previsto para operações administrativas como criar, cancelar e emitir. Servirá para transformar cada operação numa ação independente.

### Chain of Responsibility

Utilizado nos middlewares de autenticação, autorização e auditoria em `backend/src/middlewares`. Cada pedido passa por uma sequência de verificações antes de chegar ao controller, permitindo acrescentar segurança e registo sem duplicar essa lógica nas rotas.

### Publicação e subscrição

Utilizado em `backend/src/realtime/suporte.socket.js`. Cada ticket possui uma sala privada, e apenas os participantes autorizados podem subscrever os seus eventos. Serve para isolar conversas e entregar mensagens imediatamente.

## Perfis e suporte

- `PASSAGEIRO`: utiliza o assistente virtual, abre tickets e acompanha apenas os próprios pedidos;
- `GESTOR_SUPORTE` (apresentado como **Atendente**): vende bilhetes para clientes cadastrados, recebe tickets atribuídos pelo administrador, conversa com o passageiro e atualiza o estado do atendimento;
- `ADMIN`: cria gestores, consulta todos os tickets, atribui responsáveis e acompanha a auditoria.

O assistente virtual utiliza inicialmente uma base de perguntas frequentes em `backend/src/services/suporte.service.js`. Esta implementação mantém a demonstração independente de serviços externos e pode ser substituída por um adaptador de IA sem alterar as telas ou o fluxo dos tickets. As conversas humanas, atribuições e mudanças de estado ficam persistidas para rastreio.

## Configuração

```bash
cd backend
npm install
copy .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

O backend procura sempre o ficheiro `backend/.env`, independentemente da pasta actual do terminal. Portanto, também pode ser iniciado dentro de `backend/src` com `node server.js`. Se aparecer uma mensagem de variáveis obrigatórias ausentes, confirme que o ficheiro se chama exactamente `.env`, está dentro de `backend/` e não apenas em `backend/src/`.

Executar os testes unitários:

```bash
npm test
```

Com o backend em execução, o fluxo completo pode ser validado contra o MySQL:

```bash
npm run test:integracao
```

Este teste verifica CORS local, autenticação administrativa, cadastro por telefone, OTP incorreto e correto, duplicação de conta, permissões, criação de autocarro, rota e viagem, pesquisa, assentos, pagamento simulado, emissão do bilhete e bloqueio da reutilização da referência. O executor cria registos identificados como dados de integração na base de dados local.

As migrations Sequelize são a fonte principal da estrutura da base de dados. O ficheiro `backend/database/schema.sql` é mantido apenas como referência histórica.

Comandos da base de dados:

```bash
npm run db:migrate
npm run db:migrate:undo
npm run db:seed
```

Antes de executar os seeders, configure `ADMIN_NOME`, `ADMIN_APELIDO`, `ADMIN_TELEFONE` e `ADMIN_PASSWORD` no `.env`. Defina `CRIAR_DADOS_DEMO=true` apenas quando desejar criar uma viagem de demonstração.

### Dados locais para testes

Com `CRIAR_DADOS_DEMO=true`, o comando `npm run db:seed` cria contas, autocarros, rotas, viagens, bilhetes, pagamentos, reservas, notificações, auditorias e tickets de suporte. A carga é controlada pelo Sequelize e não volta a duplicar os registos depois de executada.

| Perfil | Telefone | Palavra-passe | Utilização |
| --- | --- | --- | --- |
| Administrador | `+258840000009` | `Administrador@123` | Painel administrativo e atribuição de suporte |
| Gestor de suporte | `+258840000010` | `Suporte@123` | Atendimento dos tickets atribuídos |
| Passageiro principal | `+258840000002` | `Passageiro@123` | Bilhete emitido, reserva e tickets |
| Passageiro secundário | `+258840000003` | `Passageiro@123` | Bilhete cancelado, reembolso e suporte |
| Passageiro inactivo | `+258840000004` | `Passageiro@123` | Teste de bloqueio de acesso |

Contas principais para a apresentação:

| Perfil | Telefone | Palavra-passe |
| --- | --- | --- |
| Administrador | `+258841111111` | `Admin@123` |
| Cliente | `+258842222222` | `Cliente@123` |
| Atendente | `+258843333333` | `Atendente@123` |

O atendente possui um painel próprio com **Venda de bilhetes** e **Suporte ao cliente**. A venda assistida selecciona um cliente activo, processa o pagamento simulado e guarda o bilhete directamente na conta desse cliente.

Para testar uma compra nova, use a viagem **Maputo–Xai-Xai**, criada sem bilhetes e com todos os assentos disponíveis. Os pagamentos são simulados e não movimentam dinheiro real.

O modo de desenvolvimento usa `OTP_FORNECEDOR=SIMULADO`. As opções `OTP_VALIDADE_MINUTOS`, `OTP_REENVIO_SEGUNDOS` e `OTP_EXIBIR_CODIGO` controlam a validade, o intervalo de reenvio e a apresentação do código de teste. Em produção, `OTP_EXIBIR_CODIGO` deve ser `false` e o adaptador deve ser ligado a um fornecedor real.

### Ligar o WhatsApp para OTP

1. Configure `OTP_FORNECEDOR=WHATSAPP_BAILEYS` no `backend/.env`;
2. Configure `WHATSAPP_INICIAR_AUTOMATICAMENTE=true` ou abra a seção **WhatsApp** no painel administrativo e clique em **Iniciar ligação**;
3. No telemóvel que enviará os códigos, abra **WhatsApp > Dispositivos ligados > Ligar dispositivo**;
4. Leia o QR Code apresentado no painel administrativo;
5. Confirme no painel que o estado passou para **Ligado**.

A sessão autenticada é guardada em `backend/.dados/whatsapp` quando a API é iniciada dentro da pasta `backend`. Essa pasta está ignorada pelo Git e não deve ser copiada, publicada ou partilhada. O bot adaptado não processa mensagens recebidas, grupos, comandos, ficheiros multimédia, IA ou transferências; ele apenas envia os códigos OTP gerados pelo backend.

Esta integração usa um dispositivo ligado por Baileys e não a API oficial da Meta. Para produção com maior estabilidade, conformidade e volume, o adaptador deve futuramente ser substituído pela WhatsApp Cloud API sem alterar o fluxo de OTP existente.

O backend está localizado em `backend/` e o frontend em `frontend/`.

## Endpoints atuais

```text
GET  /api/health
POST /api/autenticacao/solicitar-registo
POST /api/autenticacao/confirmar-registo
POST /api/autenticacao/iniciar-sessao
GET  /api/autenticacao/perfil
PUT  /api/autenticacao/perfil
PUT  /api/autenticacao/palavra-passe
GET  /api/conta/resumo
GET  /api/gestao/painel
GET  /api/gestao/whatsapp/estado
POST /api/gestao/whatsapp/iniciar
POST /api/gestao/autocarros
PATCH /api/gestao/autocarros/:id/estado
POST /api/gestao/rotas
PATCH /api/gestao/rotas/:id/estado
POST /api/gestao/viagens
PUT  /api/gestao/viagens/:id
PATCH /api/gestao/passageiros/:id/estado
POST /api/gestao/utilizadores
PUT  /api/gestao/utilizadores/:id
PUT  /api/gestao/utilizadores/:id/palavra-passe
PATCH /api/gestao/utilizadores/:id/estado
GET  /api/viagens/:viagemId/assentos
PATCH /api/bilhetes/:codigo/cancelar
PATCH /api/viagens/:id/cancelar
GET  /api/viagens
GET  /api/viagens/:id
POST /api/compras
GET  /api/compras/bilhete/:codigo
POST /api/pagamentos-simulados
POST /api/pagamentos-simulados/:referencia/processar
POST /api/suporte/assistente
GET  /api/suporte/tickets
POST /api/suporte/tickets
GET  /api/suporte/tickets/:id
POST /api/suporte/tickets/:id/mensagens
PATCH /api/suporte/tickets/:id/estado
GET  /api/suporte/gestores
PATCH /api/suporte/tickets/:id/atribuir
GET  /api/atendimento/clientes
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
