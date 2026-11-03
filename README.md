# Sistema de Bilhetes de Autocarros

Plataforma multiempresa para consulta e comparação de viagens, seleção de assentos, pagamento simulado, emissão de bilhetes eletrónicos e suporte ao passageiro em tempo real.

Todos os valores monetários são apresentados em **MT**.

O cadastro público é exclusivo para clientes e utiliza nome, apelido e número de telefone, com confirmação de um código OTP enviado por WhatsApp ou SMS. Empresas e respetivos administradores só podem ser criados pelo administrador da plataforma. O mesmo canal permite recuperar a palavra-passe sem revelar se um telefone está registado. A alteração de palavra-passe dentro de qualquer conta autenticada também exige um OTP exclusivo enviado pelo bot de WhatsApp. Em desenvolvimento, o envio é simulado e o código aparece na tela para permitir testes sem um fornecedor externo.

## Tecnologias

- Backend: Node.js, Express e Sequelize;
- Base de dados: MySQL;
- Frontend: React;
- Comunicação em tempo real: Socket.IO;
- Assistente de IA: OpenRouter, com escolha administrativa do modelo;
- Envio de OTP e avisos por WhatsApp: Baileys com sessão de dispositivo ligado e processo isolado no PM2;
- Linguagem: JavaScript;
- Pagamentos: APIs falsas de M-Pesa, e-Mola e cartão, com transação pendente, processamento visual e aprovação simulada.

## Arquitetura e padrões utilizados

### Arquitetura em camadas

Organiza o sistema em rotas, controladores, serviços, modelos Sequelize e base de dados. Serve para separar responsabilidades, reduzir o acoplamento e facilitar manutenção e testes.

### MVC

É utilizado através dos modelos Sequelize, controladores e rotas. Os modelos representam os dados, os controladores tratam as requisições e as rotas definem os endereços da API. Serve para separar dados, lógica e navegação.

### Multi-tenancy por linha

É utilizado nos modelos `Empresa`, `User`, `Bus`, `Route`, `Trip` e `TicketSuporte`. O campo `empresaId` identifica o proprietário de cada registo operacional, enquanto `backend/src/services/empresa-escopo.service.js` aplica o filtro da empresa autenticada. Serve para várias transportadoras utilizarem a mesma aplicação e base de dados sem conseguirem consultar ou alterar dados umas das outras. O administrador da plataforma mantém visão global para supervisão.

### Policy Object para cupões

É utilizado em `backend/src/services/cupao.service.js`. A política reúne normalização do código, validade, percentagem, compra mínima, limites globais e por cliente e cálculo monetário. Serve para aplicar as mesmas regras na pré-visualização, no pagamento e novamente dentro da transação que emite o bilhete, evitando descontos manipulados ou utilização acima do limite em compras simultâneas.

### Eliminação lógica

É utilizada na gestão de usuários e empresas. Em vez de remover fisicamente registos ligados a bilhetes, pagamentos, viagens, suporte e auditoria, o sistema marca a data de eliminação, desativa o acesso e oculta o registo das consultas operacionais. Serve para preservar o histórico e a integridade referencial, permitindo também que telefones e nomes comerciais possam voltar a ser registados com segurança.

### Catálogo canónico de localidades

É utilizado em `backend/src/services/localidades.service.js` e `frontend/src/componentes/SelecaoLocalidade.jsx`. Províncias e cidades são selecionadas de uma lista controlada e novamente validadas no backend. Serve para evitar erros de digitação, rotas duplicadas e pesquisas sem resultados causadas por nomes escritos de formas diferentes.

### Service Layer

É utilizado nos serviços do backend, incluindo `otp.service.js`, `bilhete-pdf.service.js`, `agendamento-viagem.service.js` e `assistente-empresa.service.js`. O primeiro concentra cadastro, recuperação, palavra-passe e alteração de dados pessoais por OTP; o segundo gera o documento PDF; o terceiro gera ocorrências diárias ou semanais e verifica conflitos do autocarro; o último produz análises usando exclusivamente dados agregados da empresa autenticada. Serve para manter regras de negócio reutilizáveis e independentes das rotas HTTP.

## Padrões criacionais

### Factory Method

Utilizado em `src/factories/payment.factory.js` para criar pagamentos M-Pesa, e-Mola e cartão. Serve para adicionar métodos de pagamento sem alterar diretamente o serviço principal. O ciclo académico das APIs falsas é coordenado por `backend/src/services/gateway-pagamento-simulado.service.js`: a transação começa como `PENDENTE`, é processada pelo serviço falso, passa a `APROVADO` e a referência só pode ser usada uma vez na emissão do bilhete.

### Builder

Utilizado em `src/builders/ticket.builder.js` para construir bilhetes com passageiro, viagem, assento, preço e pagamento. Serve para construir objetos complexos passo a passo.

### Singleton

Utilizado pela instância única do Sequelize exportada em `src/config/database.js` e pela instância `servicoWhatsApp` executada exclusivamente no trabalhador `backend/src/workers/whatsapp.worker.js`. Serve para manter uma única ligação lógica à base de dados e uma única sessão WhatsApp durante a execução.

Cada processo limita o pool Sequelize através de `DB_POOL_MAX` (padrão 5) e a cache do `mysql2` através de `DB_MAX_PREPARED_STATEMENTS_PER_CONNECTION` (padrão 250). A API e o trabalhador WhatsApp fecham o Sequelize ao receber `SIGTERM` ou `SIGINT`. Estas medidas impedem que reinícios do PM2 conservem ligações e que o sistema esgote o limite global de prepared statements do MySQL partilhado com outras aplicações.

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

Utilizado em `backend/src/adapters/otp.adapter.js` para isolar o envio de códigos OTP. Estão disponíveis o fornecedor simulado e `WHATSAPP_BAILEYS`; uma API oficial de WhatsApp ou SMS pode ser adicionada sem alterar os serviços de cadastro e recuperação de palavra-passe. A integração em `backend/src/integrations/openrouter` também isola o fornecedor de IA do assistente. O mesmo padrão está previsto para integrações reais de M-Pesa e e-Mola.

## Padrões comportamentais

### Strategy

Aplicado na seleção do método de pagamento, na classificação automática da prioridade dos tickets e em `frontend/src/componentes/MapaAssentos.jsx`, que escolhe entre a estratégia 3D e o mapa 2D leve conforme WebGL, memória, processadores e qualidade da ligação. Serve para trocar ou evoluir critérios sem alterar o fluxo principal da compra, suporte ou seleção de assentos.

### Observer

Utilizado no chat de suporte e no mapa de assentos através do Socket.IO. Quando uma mensagem, ticket, reserva temporária, venda ou cancelamento muda, o servidor publica o evento na respetiva sala privada. Serve para atualizar os participantes em tempo real sem depender apenas de consultas repetitivas.

### Bloqueio temporário de assentos

Ao selecionar um assento, o backend cria um bloqueio temporário na tabela `reservas`, associado ao usuário autenticado. O bloqueio é renovado enquanto a tela de pagamento permanece aberta e libertado ao trocar de lugar ou abandonar o fluxo. Outros usuários recebem a atualização por Socket.IO e veem o lugar como temporariamente reservado. A emissão exige que a reserva continue válida e pertença ao operador da compra. Transações Sequelize com bloqueio de linha e índices únicos em `reservas(viagem_id, assento_id)` e `bilhetes(viagem_id, assento_id)` formam as barreiras finais contra vendas concorrentes.

### Producer–Consumer e fila persistente

Utilizado em `backend/src/services/fila-whatsapp.service.js`. O cadastro e a gestão de viagens produzem pedidos de envio, enquanto um processador único os consome sequencialmente. Serve para não bloquear a API, conservar mensagens durante uma desconexão e controlar o ritmo de entrega ao WhatsApp.

### Transactional Outbox

Utilizado em `backend/src/services/aviso-viagem.service.js`: a notificação interna, a alteração da viagem e o registo em `envios_whatsapp` são confirmados na mesma transação Sequelize. Serve para impedir que um cancelamento seja guardado sem que o respetivo aviso também fique registado para entrega.

### Retry com recuo exponencial e idempotência

Utilizado na fila WhatsApp. As falhas temporárias são repetidas com intervalos progressivos e cada OTP ou aviso automático possui uma chave única. Serve para recuperar de problemas de ligação sem criar envios duplicados nem manter ciclos rápidos que sobrecarreguem o sistema.

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

- `PASSAGEIRO`: compara horários e preços de todas as empresas ativas, consulta perfis e avaliações, compra bilhetes, utiliza o assistente virtual, escolhe o bilhete relacionado ao abrir um ticket e acompanha apenas os próprios pedidos;
- `GESTOR_SUPORTE` (apresentado como **Atendente**): pertence a uma empresa, vende apenas os bilhetes dessa empresa, recebe os tickets que lhe foram atribuídos, conversa com o passageiro e atualiza o estado do atendimento;
- `EMPRESA_ADMIN`: administra os atendentes, autocarros, rotas, viagens, vendas, avisos e suporte exclusivamente da própria empresa;
- `ADMIN`: cria e supervisiona empresas, gere administradores da plataforma e das empresas, acompanha o volume agregado de vendas e configura serviços centrais como inteligência artificial e WhatsApp. Não gere frota, rotas, viagens, preços, bilhetes ou suporte comercial.

Na pesquisa de viagens, origem e destino são obrigatórios e a data é opcional. Quando o cliente ou atendente não escolhe uma data, o backend devolve todas as viagens futuras em ordem crescente de partida: primeiro as restantes de hoje e depois as dos dias seguintes. Quando a data é informada, os resultados ficam limitados ao dia escolhido e continuam a excluir partidas passadas. A rota é criada independentemente da frota; o autocarro é associado quando o administrador agenda uma viagem, permitindo utilizar autocarros diferentes na mesma rota.

Na página inicial, o formulário e uma lista crescente das partidas restantes de hoje e dos dias seguintes aparecem sem exigir pesquisa prévia. Quando existe uma origem habitual, a lista prioriza essa cidade; caso contrário, mostra partidas de todas as empresas. A origem escolhida é guardada apenas no dispositivo, sem coordenadas GPS nem serviços externos. Cada resultado apresenta nome e logótipo da empresa e pode ser aberto diretamente na seleção de assento. Origem e destino iguais são recusados no frontend e no backend.

Na área **Atendentes**, o administrador empresarial cria, edita, ativa, desativa, redefine a palavra-passe ou elimina contas `GESTOR_SUPORTE` da própria empresa. Esses atendentes podem prestar assistência de compra, vender apenas os bilhetes da empresa, tratar dúvidas ou problemas relacionados com bilhetes, pagamentos e viagens e responder somente aos tickets que lhes forem atribuídos. Os filtros de `empresaId` impedem acesso a vendas, clientes ou atendimentos de outra transportadora.

Na área **Cupões**, cada administrador empresarial pode criar campanhas exclusivas da sua transportadora. Um cupão possui código, descrição, percentagem entre 1% e 90%, início e fim da validade, compra mínima, limite total opcional, limite por cliente e estado ativo ou desativado. O cliente pode validar o código antes de pagar e o atendente também pode aplicá-lo numa venda assistida. O desconto, o preço original e o preço final ficam registados no bilhete; cancelar um bilhete não devolve a utilização do cupão, o que evita ciclos de compra e cancelamento para contornar os limites.

Somente o administrador da plataforma pode criar uma empresa juntamente com o seu primeiro administrador ou adicionar outro administrador a uma empresa existente. Nesse fluxo, informa o nome da empresa e as credenciais do responsável; telefone institucional, descrição, website e logótipo são acrescentados pelo administrador empresarial depois de iniciar sessão. A plataforma pode suspender, reativar, corrigir o nome e eliminar logicamente a empresa. A suspensão bloqueia imediatamente todos os usuários da empresa, inclusive quando possuem um token ainda válido. Autocarros, rotas, viagens, preços, bilhetes e tickets continuam sob responsabilidade exclusiva da empresa.

O administrador da empresa pode editar a identidade da transportadora na área **Dados da empresa**: nome, telefone institucional, descrição, website e logótipo. Os logótipos aceitam PNG, JPEG ou WebP até 2 MB, são validados pelo conteúdo do ficheiro e aparecem no painel e na pesquisa de viagens. Ao substituir ou remover um logótipo, o ficheiro antigo também é eliminado. Em **Minha conta**, qualquer perfil pode alterar nome, apelido, telefone ou palavra-passe apenas depois de confirmar o OTP enviado ao WhatsApp atual.

A auditoria completa fica disponível exclusivamente ao administrador da plataforma. O administrador empresarial possui um **Assistente IA** analítico local, com volume aprovado, valor médio, procura por rota e sugestões de campanha. Todas as consultas Sequelize recebem obrigatoriamente o `empresaId` autenticado; nenhum valor financeiro, dado pessoal ou indicador de outra empresa é enviado ao modelo externo.

Ao abrir suporte humano, o cliente pesquisa ou seleciona um bilhete próprio. O backend utiliza a viagem do bilhete para determinar a empresa e calcula a prioridade de 0 a 100 com base no tipo do problema, impacto financeiro, proximidade da partida e segurança. O cliente não escolhe a prioridade. A primeira mensagem também pode conter uma imagem JPEG, PNG ou WebP de até 2 MB.

O bilhete PDF é produzido no formato térmico POS de **80 × 210 mm**, em preto e branco, com QR Code no final dos detalhes. Esse formato pode ser impresso em rolos térmicos de 80 mm sem redução para uma página A4.

O endpoint público `POST /api/autenticacao/solicitar-registo` cria exclusivamente contas `PASSAGEIRO` e recusa tentativas de enviar `tipoConta=EMPRESA`. A criação empresarial é feita por `POST /api/gestao/empresas`, protegido pelo perfil `ADMIN`. As rotas operacionais exigem `EMPRESA_ADMIN`; o perfil global `ADMIN` é recusado nas vendas, cancelamentos, gestão de viagens e suporte comercial.

O assistente virtual utiliza inicialmente uma base de perguntas frequentes em `backend/src/services/suporte.service.js`. Esta implementação mantém a demonstração independente de serviços externos e pode ser substituída por um adaptador de IA sem alterar as telas ou o fluxo dos tickets. As conversas humanas, atribuições e mudanças de estado ficam persistidas para rastreio.

No chat de suporte, cada participante vê as próprias mensagens em azul e alinhadas à direita; as mensagens recebidas aparecem à esquerda. Passageiros, atendentes e administradores podem anexar imagens JPEG, PNG ou WebP de até 2 MB, com pré-visualização antes do envio. Os anexos são guardados localmente em `backend/.dados/suporte`, uma pasta ignorada pelo Git e servida apenas para visualização no chat.

O painel administrativo possui a secção **Inteligência artificial**, onde é possível ativar o assistente, guardar uma chave da OpenRouter, escolher o modelo e testar a ligação. A chave é cifrada com AES-256-GCM antes de ser persistida, nunca volta a ser enviada ao navegador e é removida dos registos de auditoria. O modelo inicial é `deepseek/deepseek-chat`; a versão gratuita anterior foi retirada pela OpenRouter. Se a integração estiver inativa ou indisponível, o sistema utiliza automaticamente as respostas frequentes locais.

### Segurança e respostas confirmadas da IA

- Preços, horários, lugares disponíveis, bilhetes e pagamentos são consultados no MySQL pelo backend e respondidos sem delegar os dados ao modelo externo;
- Dados de conta são sempre filtrados pelo identificador do usuário autenticado;
- Referências completas de pagamento e códigos privados não são enviados à OpenRouter;
- Perguntas que contenham telefone, e-mail, nome completo identificado, documento, endereço, cartão, CVV, palavra-passe, token ou chave são bloqueadas antes de qualquer pedido externo;
- Respostas da IA que contenham preços, datas, horários, referências ou contactos sem fonte confirmada são bloqueadas;
- A IA não possui acesso ao Sequelize, não executa compras, não cancela bilhetes e não altera pagamentos;
- Quando os dados não podem ser confirmados, o sistema encaminha o usuário para a pesquisa de viagens ou para o atendimento humano.

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
| Administrador da empresa | `+258844444444` | `Empresa@123` |
| Cliente | `+258842222222` | `Cliente@123` |
| Atendente | `+258843333333` | `Atendente@123` |

O atendente possui um painel próprio com **Venda de bilhetes** e **Suporte ao cliente**. A venda assistida selecciona um cliente activo, processa o pagamento simulado e guarda o bilhete directamente na conta desse cliente.

Para testar uma compra nova, use a viagem **Maputo–Xai-Xai**, criada sem bilhetes e com todos os assentos disponíveis. Os pagamentos são simulados e não movimentam dinheiro real.

O modo de desenvolvimento usa `OTP_FORNECEDOR=SIMULADO`. As opções `OTP_VALIDADE_MINUTOS`, `OTP_REENVIO_SEGUNDOS` e `OTP_EXIBIR_CODIGO` controlam a validade, o intervalo de reenvio e a apresentação do código de teste. Em produção, `OTP_EXIBIR_CODIGO` deve ser `false` e o adaptador deve ser ligado a um fornecedor real.

### Ligar o WhatsApp para OTP e avisos de viagem

1. Instale o gestor de processos uma única vez com `npm install -g pm2`;
2. Configure `OTP_FORNECEDOR=WHATSAPP_BAILEYS` no `backend/.env`;
3. Configure `WHATSAPP_INICIAR_AUTOMATICAMENTE=true` ou abra a seção **WhatsApp** no painel administrativo e clique em **Iniciar bot**;
4. O backend consulta o PM2. Se `viagem-bus-whatsapp` não existir, cria e guarda a instância; se existir mas estiver parada, reinicia-a; se já estiver online, não cria duplicados;
5. No telemóvel que enviará os códigos, abra **WhatsApp > Dispositivos ligados > Ligar dispositivo**;
6. Leia o QR Code apresentado no painel administrativo;
7. Confirme no painel que o estado passou para **Ligado**.

A sessão autenticada é guardada em `backend/.dados/whatsapp` e o estado apresentado no painel fica em `backend/.dados/whatsapp-estado.json`. Essa pasta está ignorada pelo Git e não deve ser copiada, publicada ou partilhada. O processo PM2 executa somente o trabalhador WhatsApp; a API não abre uma segunda sessão Baileys. O bot adaptado não processa mensagens recebidas, grupos, comandos, ficheiros multimédia, IA ou transferências. Ele apenas entrega códigos OTP e avisos operacionais de viagens.

Os envios são guardados primeiro na tabela `envios_whatsapp`. A fila dá prioridade aos OTPs, envia uma mensagem de cada vez, repete falhas com intervalos progressivos, recupera itens que ficaram em processamento após um encerramento inesperado e evita duplicações através de uma chave de idempotência. Se o WhatsApp estiver desligado, os avisos permanecem pendentes até a ligação ser restabelecida. O painel mostra o estado da fila e permite repetir avisos falhados. Ao cancelar uma viagem, todos os passageiros com bilhete ativo recebem uma notificação interna e um aviso WhatsApp; o administrador também pode enviar um aviso manual pela área **Viagens**.

`WHATSAPP_RETENCAO_DIAS` controla por quantos dias os envios concluídos, falhados ou expirados permanecem no histórico; o padrão é 90 dias. Esta versão académica utiliza exclusivamente a ligação de dispositivo do Baileys.

O backend está localizado em `backend/`, o frontend em `frontend/` e a documentação da integração do bot em `bot/`. O código executável do bot permanece integrado ao backend para partilhar a base de dados, a fila persistente e as regras de segurança sem duplicação.

## Endpoints atuais

```text
GET  /api/health
GET  /api/catalogo/localidades
GET  /api/catalogo/empresas
POST /api/cupons/validar
POST /api/autenticacao/solicitar-registo
POST /api/autenticacao/confirmar-registo
POST /api/autenticacao/solicitar-recuperacao
POST /api/autenticacao/confirmar-recuperacao
POST /api/autenticacao/iniciar-sessao
GET  /api/autenticacao/perfil
PUT  /api/autenticacao/perfil
POST /api/autenticacao/palavra-passe/solicitar-otp
PUT  /api/autenticacao/palavra-passe
GET  /api/conta/resumo
GET  /api/gestao/painel
GET  /api/gestao/empresas
POST /api/gestao/empresas
GET  /api/gestao/empresas/:id
PUT  /api/gestao/empresas/:id
PATCH /api/gestao/empresas/:id/estado
PATCH /api/gestao/empresas/:id/aprovacao
GET  /api/gestao/cupons
POST /api/gestao/cupons
PUT  /api/gestao/cupons/:id
PATCH /api/gestao/cupons/:id/estado
DELETE /api/gestao/empresas/:id
GET  /api/gestao/empresa
PUT  /api/gestao/empresa
GET  /api/gestao/whatsapp/estado
POST /api/gestao/whatsapp/iniciar
POST /api/gestao/whatsapp/envios/:id/repetir
POST /api/gestao/viagens/:id/avisos-whatsapp
GET  /api/gestao/ia/configuracao
PUT  /api/gestao/ia/configuracao
GET  /api/gestao/ia/modelos
POST /api/gestao/ia/testar
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
DELETE /api/gestao/utilizadores/:id
GET  /api/viagens/:viagemId/assentos
PATCH /api/bilhetes/:codigo/cancelar
PATCH /api/viagens/:id/cancelar
GET  /api/viagens
GET  /api/viagens/:id
POST /api/compras
GET  /api/compras/bilhete/:codigo
GET  /api/compras/bilhete/:codigo/pdf
POST /api/pagamentos-simulados
POST /api/pagamentos-simulados/:referencia/processar
POST /api/suporte/assistente
GET  /api/suporte/bilhetes/pesquisar
GET  /api/suporte/tickets
POST /api/suporte/tickets
GET  /api/suporte/tickets/:id
POST /api/suporte/tickets/:id/mensagens
PATCH /api/suporte/tickets/:id/estado
GET  /api/suporte/gestores
PATCH /api/suporte/tickets/:id/atribuir
GET  /api/catalogo/empresas
GET  /api/catalogo/empresas/:slug
POST /api/catalogo/empresas/:id/avaliacoes
GET  /api/gestao/assistente-empresa/analise
POST /api/gestao/assistente-empresa/perguntar
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

A compra exige autenticação. O nome do passageiro é obtido da conta autenticada, sem recolha de documento pessoal. O backend confirma o pagamento simulado, valida o assento na base de dados e só depois emite o bilhete. O PDF inclui um QR Code com o identificador de validação do bilhete, sem nome, telefone ou dados de pagamento do passageiro.
### Agendamento de viagens

- Uma viagem pode ser agendada para uma única data, para todos os dias ou para dias específicos da semana.
- Agendamentos recorrentes exigem período de vigência, hora de partida e duração prevista, com limite máximo de 366 dias.
- Cada ocorrência é gravada como uma viagem independente para permitir vendas, cancelamentos e avisos específicos.
- A rota é reutilizável e o autocarro é associado no agendamento da viagem.
- O mesmo autocarro não pode estar associado a viagens com horários sobrepostos; a criação usa transação e bloqueio do autocarro para evitar concorrência.
