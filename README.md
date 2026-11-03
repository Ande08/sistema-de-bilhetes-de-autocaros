# Sistema de Bilhetes de Autocarros

Plataforma web multiempresa para pesquisar viagens, comparar transportadoras, escolher assentos, simular pagamentos, emitir bilhetes com QR Code e prestar suporte ao passageiro.

O sistema foi desenvolvido em português, utiliza **MT (meticais)** como moeda e foi pensado para funcionar em computadores, tablets e principalmente telemóveis.

## Índice

- [Visão geral](#visão-geral)
- [Estado atual](#estado-atual)
- [Perfis e permissões](#perfis-e-permissões)
- [Funcionalidades](#funcionalidades)
- [Regras de negócio](#regras-de-negócio)
- [Requisitos não funcionais](#requisitos-não-funcionais)
- [Arquitetura e padrões](#arquitetura-e-padrões)
- [Princípios SOLID](#princípios-solid)
- [Tecnologias](#tecnologias)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Instalação local](#instalação-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Base de dados](#base-de-dados)
- [Dados de demonstração](#dados-de-demonstração)
- [Testes](#testes)
- [WhatsApp](#whatsapp)
- [Inteligência artificial](#inteligência-artificial)
- [PDFs](#pdfs)
- [API](#api)
- [Implantação](#implantação)
- [Segurança](#segurança)

## Visão geral

O sistema funciona como uma plataforma central onde várias empresas de transporte podem vender bilhetes. Cada transportadora possui os seus próprios administradores, atendentes, autocarros, rotas, viagens, cupões, vendas e pedidos de suporte.

Os clientes consultam numa única aplicação as viagens de todas as empresas ativas, podendo comparar horários, preços, perfis e avaliações antes de comprar.

```text
Administrador da plataforma
        |
        +-- cria e supervisiona empresas
                    |
                    +-- Administrador da empresa
                    |       +-- autocarros
                    |       +-- rotas e viagens
                    |       +-- cupões
                    |       +-- atendentes
                    |       +-- relatórios e suporte
                    |
                    +-- Atendente
                            +-- venda assistida
                            +-- suporte ao cliente

Cliente -> pesquisa -> escolhe empresa/viagem -> reserva assento
        -> pagamento simulado -> bilhete PDF com QR Code
```

## Estado atual

O projeto possui os seguintes módulos implementados:

- cadastro e autenticação de clientes por telefone e OTP;
- recuperação e alteração de palavra-passe por OTP;
- administração multiempresa com isolamento de dados;
- gestão de empresas e administradores empresariais;
- gestão de atendentes, autocarros, rotas, viagens e cupões;
- viagens únicas, diárias ou em dias específicos da semana;
- pesquisa com data opcional, localidades normalizadas e ordenação cronológica;
- seleção de assentos 3D com alternativa 2D para dispositivos limitados;
- bloqueio temporário e atualização de assentos em tempo real;
- pagamento simulado por M-Pesa, e-Mola ou cartão;
- emissão de bilhete térmico em PDF com QR Code;
- perfil público, logótipo e avaliações das empresas;
- suporte com assistente virtual, tickets, imagens e chat em tempo real;
- triagem automática da prioridade dos tickets;
- bot WhatsApp para OTP e avisos de viagem;
- auditoria administrativa com filtros;
- assistente analítico privado para cada empresa;
- relatório financeiro A4 em PDF com indicadores para tomada de decisão;
- interface responsiva, navegação mobile e modais adaptadas ao ecrã.

## Perfis e permissões

### Cliente (`PASSAGEIRO`)

Pode:

- criar conta e confirmar o telefone por OTP;
- iniciar sessão, recuperar a palavra-passe e alterar dados pessoais com OTP;
- pesquisar viagens de todas as empresas ativas;
- consultar perfil, logótipo, viagens e avaliações de uma empresa;
- escolher assento, utilizar cupão e comprar um bilhete;
- consultar compras, pagamentos e bilhetes;
- descarregar o bilhete em PDF;
- avaliar uma empresa depois de comprar um bilhete válido;
- conversar com o assistente virtual;
- criar um ticket associado a um dos seus bilhetes;
- anexar imagens e acompanhar o atendimento em tempo real.

### Atendente (`GESTOR_SUPORTE`)

Pertence obrigatoriamente a uma empresa e pode:

- pesquisar clientes ativos;
- vender somente bilhetes da própria empresa;
- aplicar cupões da própria empresa;
- consultar e responder apenas aos tickets atribuídos;
- enviar e receber imagens no chat;
- atualizar o estado do atendimento;
- alterar os próprios dados e palavra-passe mediante OTP.

### Administrador da empresa (`EMPRESA_ADMIN`)

Administra exclusivamente a sua transportadora e pode:

- completar e atualizar o perfil, telefone, website, descrição e logótipo da empresa;
- criar e gerir atendentes;
- criar autocarros e definir o respetivo mapa de assentos e lugares de janela;
- criar rotas;
- agendar e editar viagens;
- associar autocarro, rota, preço, data e frequência à viagem;
- cancelar viagens e enviar avisos aos passageiros;
- gerir cupões e campanhas;
- acompanhar bilhetes e volume de vendas da própria empresa;
- atribuir tickets aos atendentes;
- consultar o assistente analítico empresarial;
- gerar relatórios financeiros privados em PDF.

### Administrador da plataforma (`ADMIN`)

Supervisiona a plataforma, mas não opera o negócio das transportadoras. Pode:

- criar, editar, suspender, reativar e eliminar logicamente empresas;
- criar o primeiro administrador de cada empresa;
- criar outros administradores da plataforma ou das empresas;
- acompanhar quantidade de empresas, usuários, viagens e volume global de vendas;
- consultar a auditoria completa;
- configurar a integração de inteligência artificial;
- iniciar e acompanhar o bot WhatsApp;
- repetir envios WhatsApp falhados.

O administrador da plataforma **não cria autocarros, rotas ou viagens, não define preços, não vende bilhetes e não consulta a receita privada de uma empresa**.

## Funcionalidades

### Cadastro e conta

- O cadastro público cria apenas clientes.
- São solicitados nome, apelido, telefone e palavra-passe.
- Não é solicitado documento pessoal.
- O telefone é normalizado para o formato moçambicano.
- A conta só é ativada depois da confirmação do OTP.
- Login e recuperação utilizam telefone, não e-mail.
- Os campos de palavra-passe possuem opção para mostrar ou ocultar o conteúdo.
- A alteração de nome, apelido, telefone ou palavra-passe exige OTP enviado ao número atual.

### Empresas

- Somente um administrador da plataforma cria empresas.
- A empresa é criada juntamente com o primeiro administrador empresarial.
- O administrador empresarial completa posteriormente os dados institucionais.
- Logótipos PNG, JPEG e WebP de até 2 MB são validados pelo conteúdo do ficheiro.
- Empresas suspensas deixam imediatamente de operar, mesmo que os seus usuários possuam tokens ainda válidos.
- A eliminação é lógica para preservar bilhetes, pagamentos, suporte e auditoria.

### Pesquisa de viagens

- Origem e destino utilizam províncias e cidades de um catálogo controlado.
- Origem e destino iguais são recusados no frontend e no backend.
- A data é opcional.
- Sem data, são mostradas as partidas futuras em ordem crescente: restantes de hoje, amanhã e dias seguintes.
- Com data, são mostradas apenas as partidas futuras desse dia.
- Datas passadas não podem ser selecionadas nem consultadas.
- A página inicial apresenta viagens sem obrigar o cliente a pesquisar.
- Quando existe uma origem habitual guardada no dispositivo, os resultados dessa cidade são priorizados.
- Cada resultado mostra empresa, logótipo, rota, data, hora e preço em MT.

### Autocarros e assentos

- O administrador empresarial define a quantidade e distribuição de assentos.
- Cada assento pode ser identificado como assento de janela.
- O mapa 3D utiliza Three.js.
- Dispositivos sem WebGL, com pouca memória ou ligação limitada recebem automaticamente o mapa 2D.
- Uma reserva temporária é criada quando o usuário escolhe um assento.
- O bloqueio é renovado durante o pagamento e libertado ao abandonar ou trocar o lugar.
- Socket.IO informa imediatamente os outros clientes sobre reservas, vendas e libertações.
- Índices únicos e bloqueios de linha impedem que dois usuários comprem o mesmo assento.

### Rotas e viagens

- A rota representa origem e destino e não depende de um autocarro específico.
- O autocarro é associado no agendamento da viagem.
- Uma viagem pode ocorrer uma única vez, todos os dias ou em dias escolhidos da semana.
- Recorrências possuem período máximo de 366 dias.
- Cada ocorrência é gravada como uma viagem independente.
- O mesmo autocarro não pode ser usado em viagens com horários sobrepostos.
- A tabela administrativa mostra a frequência configurada.

### Cupões

Cada cupão pertence a uma única empresa e possui:

- código normalizado;
- descrição;
- percentagem entre 1% e 90%;
- início e fim da validade;
- compra mínima;
- limite global opcional;
- limite por cliente;
- estado ativo ou inativo.

O cupão é validado antes do pagamento e novamente dentro da transação de emissão. O bilhete guarda preço original, desconto e preço final. O cancelamento do bilhete não devolve a utilização do cupão.

### Pagamentos e bilhetes

- Os pagamentos são académicos e não movimentam dinheiro real.
- Estão disponíveis M-Pesa, e-Mola e cartão.
- A interface apresenta uma modal de processamento antes da aprovação simulada.
- A referência de pagamento só pode emitir um bilhete.
- O bilhete fica associado ao cliente, empresa, viagem e assento.
- O PDF possui formato térmico POS de 80 × 210 mm.
- O QR Code aparece no final dos detalhes e não contém telefone nem dados de pagamento.
- Um bilhete cancelado permanece no histórico.

### Suporte

- O cliente começa pelo assistente de perguntas frequentes.
- Quando necessita de uma pessoa, abre um ticket associado a um bilhete próprio.
- É possível pesquisar o bilhete pelo código.
- A empresa responsável é determinada automaticamente pela viagem do bilhete.
- O cliente não escolhe a prioridade.
- A prioridade de 0 a 100 considera categoria, palavras críticas, impacto financeiro, segurança e proximidade da partida.
- A primeira mensagem e as mensagens seguintes podem incluir imagens.
- Mensagens enviadas aparecem em azul e à direita; recebidas aparecem à esquerda.
- O histórico, atribuição e mudanças de estado são persistidos.

### Experiência do cliente

- No computador, o painel utiliza menu lateral, cabeçalho e área principal.
- No telemóvel, utiliza cabeçalho compacto e navegação inferior.
- A barra de pesquisa ocupa toda a largura útil no mobile.
- As modais respeitam a largura e altura disponíveis, possuem rolagem interna e margens seguras.
- Cartões de viagem reorganizam empresa, rota, horário, preço e botão de compra conforme o tamanho do ecrã.
- A ação de terminar sessão continua acessível em computadores, tablets e telemóveis.

## Regras de negócio

1. O cadastro público cria somente clientes.
2. Empresas e administradores empresariais são criados pelo administrador da plataforma.
3. Toda entidade operacional pertence a uma empresa por meio de `empresaId`.
4. Uma empresa não pode consultar ou alterar dados de outra empresa.
5. Administradores da plataforma não realizam operações comerciais das empresas.
6. Usuários administrativos não podem comprar bilhetes como passageiros.
7. Origem e destino de uma rota ou pesquisa devem ser diferentes.
8. Viagens passadas não podem ser vendidas.
9. Um autocarro não pode realizar duas viagens sobrepostas.
10. Um assento não pode possuir duas reservas válidas ou dois bilhetes ativos na mesma viagem.
11. A emissão exige pagamento aprovado e reserva válida pertencente ao comprador ou atendente autorizado.
12. Um atendente vende apenas viagens da própria empresa.
13. Um cupão só pode ser aplicado em viagens da empresa que o criou.
14. O cliente só avalia uma empresa depois de possuir bilhete válido dessa empresa.
15. Um ticket de suporte deve estar associado a um bilhete do cliente.
16. A prioridade do suporte é calculada pelo sistema.
17. Alterações pessoais e de palavra-passe exigem OTP.
18. Suspender uma empresa bloqueia todos os usuários associados.
19. Cancelar uma viagem regista notificações e avisos WhatsApp para os passageiros afetados.
20. Valores apresentados pelo painel da plataforma representam volume de vendas, não receita líquida nem lucro.

## Requisitos não funcionais

### Segurança

- autenticação JWT;
- palavras-passe cifradas com bcrypt;
- autorização por perfil e empresa;
- validação no frontend e backend;
- Helmet e CORS;
- auditoria de operações administrativas;
- segredos de IA cifrados com AES-256-GCM;
- remoção de segredos dos registos;
- anexos validados por tipo, tamanho e assinatura binária;
- OTP com validade e intervalo de reenvio;
- encerramento correto das ligações Sequelize.

### Desempenho e estabilidade

- pool Sequelize configurável;
- limite de prepared statements por ligação MySQL;
- limites nas consultas administrativas;
- fila persistente para envios WhatsApp;
- repetição com recuo exponencial;
- carregamento do mapa 3D apenas quando o dispositivo suporta;
- mapa 2D como alternativa leve;
- build de produção otimizado pelo Vite.

### Usabilidade e acessibilidade

- interface em português;
- moeda padronizada em MT;
- formulários responsivos;
- modais adaptadas ao mobile;
- mensagens de erro legíveis;
- localidades selecionadas em listas;
- estado visual de assentos e pagamentos;
- navegação específica para cada perfil.

### Manutenibilidade

- arquitetura em camadas;
- código separado por domínio;
- migrations versionadas;
- serviços reutilizáveis;
- comentários nas regras mais sensíveis;
- testes automatizados de regras de negócio, segurança e API do frontend.

## Arquitetura e padrões

### Princípios SOLID

O projeto aplica SOLID de forma pragmática. Como JavaScript não obriga a declarar interfaces, alguns contratos são definidos pelo comportamento esperado dos módulos e protegidos por testes automatizados.

| Princípio | Onde aparece | Como foi aplicado | Por que foi aplicado |
| --- | --- | --- | --- |
| **S — Single Responsibility Principle** | `routes`, `controllers`, `services`, `models`, `validacoes`, `bilhete-pdf.service.js`, `relatorio-financeiro.service.js` e `fila-whatsapp.service.js` | Cada módulo possui uma responsabilidade principal: a rota escolhe o controller, o controller traduz HTTP, o serviço executa a regra de negócio, o modelo representa dados e o gerador PDF apenas constrói o documento. OTP, cupões, anexos, reservas, relatórios e WhatsApp também possuem serviços próprios. | Evita ficheiros que fazem tudo, reduz efeitos colaterais e permite alterar uma regra sem modificar módulos não relacionados. |
| **O — Open/Closed Principle** | `otp.adapter.js`, `payment.factory.js`, integração OpenRouter, mapa 2D/3D e serviços de pagamento | O fluxo principal utiliza pontos de extensão. Um fornecedor OTP implementa `enviar`, um pagamento implementa `processar` e a seleção do mapa troca a estratégia sem mudar o fluxo da compra. Para adicionar um fornecedor, cria-se uma nova implementação e regista-se na respetiva fábrica ou seleção. | Permite acrescentar SMS, uma API oficial de pagamentos ou outra renderização com alterações localizadas. A aplicação é aberta à extensão e mantém estáveis os serviços consumidores. |
| **L — Liskov Substitution Principle** | `AdaptadorOtpSimulado`, `AdaptadorOtpWhatsApp` e objetos de pagamento criados pela fábrica | Os adaptadores OTP aceitam os mesmos dados e devolvem uma promessa com resultado de envio; os pagamentos devolvem referência, método, valor e estado. O serviço consumidor usa o contrato e não precisa conhecer a classe concreta. | Garante que a implementação simulada pode ser substituída pela implementação WhatsApp sem quebrar cadastro, recuperação ou alteração de dados. |
| **I — Interface Segregation Principle** | Adaptador OTP, serviços especializados, middlewares de autorização e funções de escopo empresarial | Em vez de uma interface administrativa genérica e extensa, existem contratos pequenos: `enviar` para OTP, `processar` para pagamento, `emitir` para bilhete e middlewares separados para cada conjunto de perfis. Os controllers importam apenas as operações necessárias. | Evita obrigar módulos a depender de métodos que não usam e reduz permissões excessivas, acoplamento e complexidade dos testes. |
| **D — Dependency Inversion Principle** | `ServicoOtp -> obterAdaptadorOtp`, `ServicoPagamento -> FabricaPagamento`, `ServicoBilhete -> ConstrutorBilhete` e assistente com integração OpenRouter | Serviços de alto nível pedem capacidades como enviar OTP, processar pagamento ou construir bilhete por meio de fábricas, adaptadores e serviços especializados. Detalhes como Baileys, simulação e OpenRouter ficam nas extremidades. | Impede que regras de cadastro, compra e suporte dependam diretamente de bibliotecas externas, facilitando substituição, testes e contingência. |

#### Exemplo do fluxo SOLID

```text
Controller de autenticação
        -> ServicoOtp
                -> obterAdaptadorOtp()
                        -> AdaptadorOtpSimulado
                        -> AdaptadorOtpWhatsApp
```

O controller não sabe como o WhatsApp funciona. O serviço aplica validade, tentativas e finalidade do código; o adaptador apenas entrega a mensagem. Essa separação combina SRP, OCP, LSP, ISP e DIP no mesmo fluxo.

### Padrões arquiteturais

| Padrão | Onde é utilizado | Como foi aplicado | Por que foi aplicado |
| --- | --- | --- | --- |
| Arquitetura em camadas | `routes`, `controllers`, `services`, `models` e `database` | O pedido entra pela rota, passa pelo controller, executa regras num serviço e persiste por modelos Sequelize. Migrations mantêm a estrutura física separada. | Separa responsabilidades, reduz acoplamento e facilita localizar, testar e manter cada parte. |
| MVC | Modelos Sequelize, controllers Express e componentes/páginas React | Models representam entidades, controllers tratam pedidos e a interface React apresenta e captura ações do usuário. | Evita misturar persistência, regras HTTP e apresentação. |
| Cliente-servidor | Frontend React, API Express e Socket.IO | O navegador consome JSON por HTTP e recebe eventos em tempo real; frontend e backend são construídos e executados separadamente. | Permite clientes diferentes, implantação independente e uma API central para aplicar segurança. |
| REST | `backend/src/routes` | Recursos como viagens, empresas, bilhetes e tickets possuem URLs e métodos `GET`, `POST`, `PUT`, `PATCH` e `DELETE`, com códigos HTTP e JSON. | Torna a API previsível, testável e fácil de integrar. |
| Multi-tenancy por linha | `empresaId` e `empresa-escopo.service.js` | Entidades operacionais guardam o proprietário; consultas recebem o filtro da empresa autenticada e `garantirMesmaEmpresa` valida alterações. | Permite várias transportadoras na mesma instalação sem expor dados entre elas. |
| Arquitetura orientada a eventos | Socket.IO, notificações e fila WhatsApp | Alterações de assentos e suporte publicam eventos em salas autorizadas; avisos são gravados numa fila e consumidos pelo trabalhador. | Entrega atualizações rápidas sem polling excessivo e evita bloquear a API durante envios. |
| Service Layer | `backend/src/services` | Regras de compra, cupões, OTP, relatórios, viagens e suporte são funções ou classes chamadas pelos controllers. | Reutiliza regras em diferentes endpoints e mantém controllers pequenos. |

### Padrões criacionais

| Padrão | Onde é utilizado | Como foi aplicado | Por que foi aplicado |
| --- | --- | --- | --- |
| Factory Method | `backend/src/factories/payment.factory.js` | `FabricaPagamento.criar(metodo)` normaliza o método, valida a opção e devolve um objeto com `processar`. `ServicoPagamento` usa o produto sem conhecer a sua criação. | Centraliza a escolha de M-Pesa, e-Mola ou cartão e prepara a troca das simulações por integrações reais. |
| Factory de adaptador | `backend/src/adapters/otp.adapter.js` | `obterAdaptadorOtp()` lê a configuração e cria `AdaptadorOtpSimulado` ou `AdaptadorOtpWhatsApp`. | Mantém a decisão do fornecedor fora das regras de OTP. |
| Builder | `backend/src/builders/ticket.builder.js` | `ConstrutorBilhete` recebe passageiro, viagem, assento, pagamento e preço em passos encadeados; `construir()` valida os campos e emite o objeto final. | Facilita construir uma entidade complexa e impede bilhetes incompletos. |
| Builder de documento | `relatorio-financeiro.service.js` e `bilhete-pdf.service.js` | O PDF é montado progressivamente com cabeçalho, identidade, indicadores, tabelas, QR Code, movimentos e rodapés. | Mantém a composição visual legível e permite acrescentar blocos sem concentrar tudo numa única expressão. |
| Singleton | `backend/src/config/database.js` | Uma instância Sequelize é criada no carregamento do módulo e exportada para todos os modelos e serviços daquele processo. | Evita configurações e pools duplicados dentro da API ou do trabalhador. |
| Singleton de sessão | `whatsapp.service.js` e `whatsapp.worker.js` | O módulo exporta um único serviço e o PM2 mantém uma única instância do trabalhador ligada à pasta da sessão. | Evita duas ligações Baileys disputarem as mesmas credenciais e duplicarem mensagens. |

### Padrões estruturais

| Padrão | Onde é utilizado | Como foi aplicado | Por que foi aplicado |
| --- | --- | --- | --- |
| Adapter de OTP | `adapters/otp.adapter.js` | Baileys e o modo simulado são traduzidos para uma operação comum `enviar({ telefone, codigo, canal })`. | Permite mudar o meio de entrega sem modificar cadastro, recuperação ou alteração de conta. |
| Adapter de IA | `integrations/openrouter/openrouter.service.js` | Formato interno de mensagens e configuração é convertido no pedido esperado pela OpenRouter; a resposta externa é normalizada. | Isola fornecedor, autenticação e detalhes HTTP das regras de segurança do assistente. |
| Facade de compra | `compra.service.js` | `ServicoCompra.comprar` coordena usuário, viagem, assento, reserva, cupão, pagamento, transação, bilhete e confirmação. | Oferece ao controller uma única operação e esconde um fluxo transacional complexo. |
| Facade de bilhete | `ticket.service.js` | `ServicoBilhete.emitir` fornece uma operação simples e usa internamente o Builder. | Impede que controllers precisem conhecer a sequência de construção. |
| Repository por modelos | Modelos Sequelize e serviços | `findOne`, `findAll`, `create` e transações ficam no backend, agrupados junto das regras do domínio; React nunca consulta MySQL diretamente. | Centraliza persistência, facilita filtros multiempresa e evita SQL espalhado. |
| Facade de infraestrutura | `pm2-whatsapp.service.js` | Expõe operações de estado e arranque enquanto encapsula comandos e nomes de processo do PM2. | Mantém detalhes do gestor de processos fora do controller e do painel. |

### Padrões comportamentais

| Padrão | Onde é utilizado | Como foi aplicado | Por que foi aplicado |
| --- | --- | --- | --- |
| Strategy de pagamento | `payment.factory.js`, `payment.service.js` e gateway simulado | O método selecionado determina o processador usado, mantendo a mesma entrada e saída para o fluxo de compra. | Permite variar o comportamento de pagamento sem criar condicionais em todos os consumidores. |
| Strategy de visualização | `frontend/src/componentes/MapaAssentos.jsx` | O componente avalia WebGL, memória, processadores e ligação para escolher mapa Three.js ou mapa 2D. | Mantém a seleção utilizável em telemóveis simples e ligações lentas. |
| Observer | Socket.IO em `suporte.socket.js` e eventos de assentos | Clientes entram em salas e recebem eventos quando mensagens, reservas, vendas ou libertações mudam. | Sincroniza várias telas sem recarregar a página ou consultar continuamente. |
| State | Pagamentos, bilhetes, viagens, reservas e tickets | Cada entidade guarda um estado enumerado; serviços validam o estado atual antes de permitir a próxima operação. | Impede transições inválidas, como emitir sem aprovação ou vender viagem cancelada. |
| Chain of Responsibility | Middlewares de autenticação, autorização e auditoria | Express executa os middlewares em sequência; cada um valida uma preocupação e chama `next` apenas quando o pedido pode continuar. | Reutiliza segurança e auditoria sem duplicá-las em cada controller. |
| Policy Object | `cupao.service.js` | As regras de código, validade, percentagem, compra mínima e limites são reunidas e executadas antes e durante a transação. | Garante a mesma política na pré-visualização, venda normal e venda assistida. |
| Producer–Consumer | `fila-whatsapp.service.js` e `whatsapp.worker.js` | A API grava itens em `envios_whatsapp`; um trabalhador separado obtém e envia um item de cada vez. | Evita bloquear pedidos e conserva mensagens durante desconexões. |
| Retry com recuo exponencial | Fila WhatsApp | O número de tentativas define intervalos progressivos e um limite final; itens falhados podem ser repetidos pelo painel. | Recupera falhas temporárias sem criar um ciclo rápido que sobrecarregue WhatsApp ou MySQL. |
| Publicação e subscrição | Salas `suporte:{id}`, `assentos:{id}`, `empresa:{id}` e `utilizador:{id}` | O servidor autentica o socket, autoriza a entrada e publica apenas na sala relacionada. | Entrega eventos em tempo real sem expor conversas ou dados a usuários não autorizados. |

### Padrões de consistência e integração

| Padrão | Onde é utilizado | Como foi aplicado | Por que foi aplicado |
| --- | --- | --- | --- |
| Transactional Outbox | `aviso-viagem.service.js` e `envios_whatsapp` | Cancelamento, notificação e criação do item da fila são gravados na mesma transação Sequelize; o envio externo ocorre depois. | Evita guardar o cancelamento sem deixar o respetivo aviso preparado. |
| Idempotência | Fila WhatsApp e referências de pagamento | Envios automáticos usam chave única; pagamentos guardam utilização e rejeitam uma segunda emissão com a mesma referência. | Torna repetições e reinícios seguros sem duplicar mensagens ou bilhetes. |
| Bloqueio pessimista | `compra.service.js`, reservas e agendamento | Linhas de viagem, assento, cupão ou autocarro são lidas com `LOCK.UPDATE` dentro de transações; índices únicos fornecem proteção final. | Resolve concorrência entre compradores e entre administradores que agendam o mesmo autocarro. |
| Eliminação lógica | Usuários e empresas | O registo recebe data de eliminação, é desativado e deixa de aparecer nas consultas operacionais, mas permanece relacionado ao histórico. | Preserva auditoria, bilhetes e pagamentos e permite reutilizar telefone ou nome com segurança. |
| Fallback | `assistente-ia.service.js` e `MapaAssentos.jsx` | Falhas da OpenRouter retornam respostas locais; incapacidade gráfica seleciona o mapa 2D. | Mantém o sistema funcional mesmo quando um serviço externo ou recurso do dispositivo não está disponível. |

## Tecnologias

### Backend

- Node.js, Express e Sequelize;
- MySQL com `mysql2`;
- Socket.IO;
- JWT e bcrypt;
- PDFKit e QRCode;
- Baileys e PM2.

### Frontend

- React 18 e Vite;
- Socket.IO Client;
- Three.js;
- CSS responsivo sem biblioteca visual externa;
- Vitest.

### Integrações

- OpenRouter para modelos de IA;
- WhatsApp por ligação de dispositivo Baileys;
- APIs falsas de M-Pesa, e-Mola e cartão.

## Estrutura do projeto

```text
sistema de bilhete/
|-- backend/
|   |-- src/
|   |   |-- adapters/
|   |   |-- builders/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- database/
|   |   |-- factories/
|   |   |-- integrations/
|   |   |-- middlewares/
|   |   |-- models/
|   |   |-- realtime/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- validacoes/
|   |   `-- workers/
|   |-- scripts/
|   `-- test/
|-- frontend/
|   |-- src/
|   |   |-- componentes/
|   |   |-- servicos/
|   |   `-- utilitarios/
|   `-- public/
|-- bot/
|   `-- README.md
|-- output/pdf/
|-- Projecto Eng. software II.pdf
`-- README.md
```

Os dados gerados em execução ficam em `backend/.dados/` e não são enviados ao Git.

## Instalação local

### Requisitos

- Node.js 20 ou superior;
- MySQL 8 ou compatível;
- npm;
- PM2 apenas para testar o trabalhador WhatsApp como serviço.

### 1. Clonar e instalar

```bash
git clone https://github.com/Ande08/sistema-de-bilhetes-de-autocaros.git
cd sistema-de-bilhetes-de-autocaros/backend
npm install
cp .env.example .env
```

No Windows CMD, utilize `copy .env.example .env`.

### 2. Preparar a base de dados

```sql
CREATE DATABASE sistema_bilhetes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Edite `backend/.env` e execute:

```bash
npm run db:migrate
npm run db:seed
npm start
```

O servidor correto é `backend/src/server.js`. A partir de `backend/`, use `npm start` ou `node src/server.js`.

### 3. Iniciar o frontend

Noutro terminal:

```bash
cd frontend
npm install
npm run dev
```

Endereços locais padrão:

- frontend: `http://localhost:5173`;
- backend: `http://localhost:3000`;
- verificação da API: `http://localhost:3000/api/health`.

## Variáveis de ambiente

O backend carrega sempre `backend/.env`, mesmo quando o processo é iniciado noutra pasta.

| Variável | Exemplo | Finalidade |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP da API. |
| `NODE_ENV` | `development` | Ambiente de execução. |
| `CLIENT_URL` | `http://localhost:5173` | Origem autorizada no CORS. |
| `DB_HOST` | `localhost` | Servidor MySQL. |
| `DB_PORT` | `3306` | Porta MySQL. |
| `DB_NAME` | `sistema_bilhetes` | Base de dados. |
| `DB_USER` | `root` | Usuário MySQL. |
| `DB_PASSWORD` | valor privado | Palavra-passe MySQL. |
| `DB_POOL_MAX` | `5` | Máximo de ligações Sequelize por processo. |
| `DB_MAX_PREPARED_STATEMENTS_PER_CONNECTION` | `250` | Limite da cache de statements por ligação. |
| `JWT_SECRET` | segredo longo | Assinatura dos tokens. |
| `JWT_EXPIRACAO` | `1d` | Validade do token. |
| `ADMIN_*` | dados privados | Credenciais do administrador inicial. |
| `OTP_FORNECEDOR` | `SIMULADO` | `SIMULADO` ou `WHATSAPP_BAILEYS`. |
| `OTP_VALIDADE_MINUTOS` | `10` | Validade do OTP. |
| `OTP_REENVIO_SEGUNDOS` | `60` | Intervalo mínimo de reenvio. |
| `OTP_EXIBIR_CODIGO` | `true` | Mostra o código apenas em desenvolvimento. |
| `PAGAMENTO_SIMULADO_ATRASO_MS` | `1200` | Duração visual do processamento falso. |
| `RESERVA_ASSENTO_MINUTOS` | `3` | Validade do bloqueio temporário. |
| `WHATSAPP_INICIAR_AUTOMATICAMENTE` | `false` | Inicia o trabalhador no arranque. |
| `WHATSAPP_SESSION_PATH` | `.dados/whatsapp` | Pasta privada da sessão. |
| `WHATSAPP_PM2_NOME` | `viagem-bus-whatsapp` | Nome do processo PM2. |
| `WHATSAPP_RETENCAO_DIAS` | `90` | Retenção do histórico da fila. |
| `CRIAR_DADOS_DEMO` | `false` | Ativa seeders de apresentação. |

No frontend, `VITE_URL_API` define a API usada pelo navegador. Exemplo de produção:

```ini
VITE_URL_API=https://ticket.famba.online/api
```

Nunca envie ficheiros `.env`, sessões WhatsApp, chaves da OpenRouter ou palavras-passe para o repositório.

## Base de dados

Sequelize é o ORM oficial do projeto. As migrations em `backend/src/database/migrations` são a fonte de verdade da estrutura.

```bash
cd backend
npm run db:migrate
npm run db:migrate:undo
npm run db:seed
```

Entidades principais:

- usuários e verificações OTP;
- empresas e avaliações;
- autocarros e assentos;
- rotas e viagens;
- reservas e bilhetes;
- pagamentos e cupões;
- tickets e mensagens de suporte;
- notificações e auditoria;
- configuração de IA;
- fila de envios WhatsApp.

### Proteção do MySQL partilhado

Cada processo limita o pool e a cache do `mysql2`:

```ini
DB_POOL_MAX=5
DB_MAX_PREPARED_STATEMENTS_PER_CONNECTION=250
```

A API e o trabalhador fecham o Sequelize ao receber `SIGTERM` ou `SIGINT`. Não aumente o limite global `max_prepared_stmt_count` para esconder consumo excessivo.

## Dados de demonstração

Antes do primeiro `npm run db:seed`, configure no `.env`:

```ini
ADMIN_NOME=Administrador
ADMIN_APELIDO=Sistema
ADMIN_TELEFONE=+258841111111
ADMIN_PASSWORD=Admin@123
CRIAR_DADOS_DEMO=true
```

Contas de apresentação criadas pelos seeders:

| Perfil | Telefone | Palavra-passe |
| --- | --- | --- |
| Administrador da plataforma | `+258841111111` | `Admin@123` |
| Administrador da empresa | `+258844444444` | `Empresa@123` |
| Cliente | `+258842222222` | `Cliente@123` |
| Atendente | `+258843333333` | `Atendente@123` |

Estas credenciais são apenas para demonstração. Altere-as em qualquer instalação acessível pela internet.

## Testes

### Backend

```bash
cd backend
npm test
```

A cobertura funcional atual inclui autenticação, OTP, permissões, multiempresa, cupões, pagamentos, compras, reservas concorrentes, suporte, IA, PDFs, WhatsApp, migrations e proteção da base de dados.

Para validar o fluxo completo contra uma base MySQL local:

```bash
npm run test:integracao
```

### Frontend

```bash
cd frontend
npm test
npm run build
```

Os testes cobrem serviços da API, moeda, viagens iniciais, mapa de assentos e alinhamento das mensagens do suporte.

## WhatsApp

O bot foi reduzido às tarefas necessárias ao sistema:

- enviar OTP;
- enviar avisos manuais de viagem;
- avisar passageiros quando uma viagem é cancelada;
- manter os envios numa fila persistente;
- repetir falhas sem bloquear a API.

### Ligação pelo painel

1. Instale PM2 com `npm install -g pm2`.
2. Configure `OTP_FORNECEDOR=WHATSAPP_BAILEYS`.
3. Entre como administrador da plataforma.
4. Abra a área WhatsApp e clique em **Iniciar bot**.
5. O backend verifica se a instância PM2 existe, cria-a ou reinicia-a quando necessário.
6. Leia o QR Code em **WhatsApp > Dispositivos ligados**.
7. Aguarde o estado **Ligado**.

O processo deve executar apenas `backend/src/workers/whatsapp.worker.js`. Não inicie uma segunda instância Baileys manualmente.

As credenciais ficam em `backend/.dados/whatsapp` e os envios na tabela `envios_whatsapp`. OTPs têm prioridade, falhas usam recuo exponencial e cada mensagem automática possui chave de idempotência.

## Inteligência artificial

### Configuração global

O administrador da plataforma pode ativar a integração, guardar a chave da OpenRouter, selecionar o modelo e testar a ligação. O modelo padrão é `deepseek/deepseek-chat`. A chave é cifrada com AES-256-GCM e nunca volta a ser enviada ao navegador.

### Assistente do cliente

Responde inicialmente com uma base local de perguntas frequentes. Questões que exigem análise humana são encaminhadas para tickets.

### Assistente e relatório empresarial

O administrador empresarial consulta exclusivamente dados confirmados da própria empresa. O relatório A4 com logótipo inclui:

- pagamentos, volume aprovado, valor médio e descontos;
- comparação com o período anterior equivalente;
- variação do volume e da quantidade de pagamentos;
- média diária e dias com vendas;
- valor antes dos descontos e peso dos descontos;
- concentração da rota principal;
- desempenho por rota e método de pagamento;
- procura por dia e faixa horária de partida;
- recomendações sobre frota, frequência e campanhas;
- lista dos movimentos aprovados.

O relatório apresenta **volume de vendas**, não lucro. O sistema não possui custos operacionais suficientes para calcular lucro ou margem real.

### Proteções contra respostas inventadas

- preços, horários, lugares, bilhetes e pagamentos são lidos do MySQL;
- o modelo não recebe acesso ao Sequelize;
- dados são filtrados pelo usuário e `empresaId` autenticados;
- referências completas, tokens, palavras-passe, cartões e chaves não são enviados;
- perguntas com dados pessoais ou segredos são bloqueadas antes do pedido externo;
- respostas externas com valores, horários ou contactos não confirmados são rejeitadas;
- a IA não compra, cancela, reembolsa nem altera registos;
- quando não existe fonte segura, o sistema informa a limitação e encaminha para suporte.

## PDFs

### Bilhete

- formato térmico POS de 80 × 210 mm;
- preto e branco para impressão económica;
- empresa, rota, horário, assento, preço e código;
- QR Code no final dos detalhes;
- sem telefone ou informação financeira sensível no QR Code.

### Relatório empresarial

- formato A4 e cores do sistema;
- logótipo e nome da empresa;
- tabelas, indicadores, recomendações e paginação;
- pronto para descarregar e imprimir;
- isolado pelo `empresaId` do administrador autenticado.

## API

Todas as rotas usam o prefixo `/api`.

### Saúde e catálogo

```text
GET  /health
GET  /catalogo/localidades
GET  /catalogo/empresas
GET  /catalogo/empresas/:slug
POST /catalogo/empresas/:id/avaliacoes
GET  /viagens
GET  /viagens/:id
GET  /viagens/:viagemId/assentos
```

### Autenticação e conta

```text
POST /autenticacao/solicitar-registo
POST /autenticacao/confirmar-registo
POST /autenticacao/solicitar-recuperacao
POST /autenticacao/confirmar-recuperacao
POST /autenticacao/iniciar-sessao
GET  /autenticacao/perfil
POST /autenticacao/perfil/solicitar-otp
PUT  /autenticacao/perfil
POST /autenticacao/palavra-passe/solicitar-otp
PUT  /autenticacao/palavra-passe
GET  /conta/resumo
```

### Compra e pagamento

```text
POST  /cupons/validar
POST  /pagamentos-simulados
POST  /pagamentos-simulados/:referencia/processar
POST  /compras
GET   /compras/bilhete/:codigo
GET   /compras/bilhete/:codigo/pdf
PATCH /bilhetes/:codigo/cancelar
```

### Administração

```text
GET    /gestao/painel
GET    /gestao/empresas
POST   /gestao/empresas
GET    /gestao/empresas/:id
PUT    /gestao/empresas/:id
PATCH  /gestao/empresas/:id/estado
PATCH  /gestao/empresas/:id/aprovacao
DELETE /gestao/empresas/:id
GET    /gestao/empresa
PUT    /gestao/empresa
POST   /gestao/autocarros
PATCH  /gestao/autocarros/:id/estado
POST   /gestao/rotas
PATCH  /gestao/rotas/:id/estado
POST   /gestao/viagens
PUT    /gestao/viagens/:id
PATCH  /viagens/:id/cancelar
POST   /gestao/viagens/:id/avisos-whatsapp
GET    /gestao/cupons
POST   /gestao/cupons
PUT    /gestao/cupons/:id
PATCH  /gestao/cupons/:id/estado
POST   /gestao/utilizadores
PUT    /gestao/utilizadores/:id
PUT    /gestao/utilizadores/:id/palavra-passe
PATCH  /gestao/utilizadores/:id/estado
DELETE /gestao/utilizadores/:id
```

### Suporte, IA e WhatsApp

```text
POST  /suporte/assistente
GET   /suporte/bilhetes/pesquisar
GET   /suporte/tickets
POST  /suporte/tickets
GET   /suporte/tickets/:id
POST  /suporte/tickets/:id/mensagens
PATCH /suporte/tickets/:id/estado
PATCH /suporte/tickets/:id/atribuir
GET   /suporte/gestores
GET   /atendimento/clientes
GET   /gestao/ia/configuracao
PUT   /gestao/ia/configuracao
GET   /gestao/ia/modelos
POST  /gestao/ia/testar
GET   /gestao/assistente-empresa/analise
POST  /gestao/assistente-empresa/perguntar
GET   /gestao/assistente-empresa/relatorio-financeiro.pdf
GET   /gestao/whatsapp/estado
POST  /gestao/whatsapp/iniciar
POST  /gestao/whatsapp/envios/:id/repetir
```

## Implantação

Na implantação atual, o domínio público é `ticket.famba.online`. Uma distribuição recomendada é:

- backend em `127.0.0.1:6200` sob PM2;
- frontend em `127.0.0.1:6201` sob PM2;
- Nginx recebe HTTPS e encaminha `/api`, `/socket.io` e `/ficheiros` para o backend;
- as restantes rotas são encaminhadas para o frontend.

Exemplo de atualização na VPS:

```bash
cd /root/ticket
git pull origin main

cd backend
npm install
npm run db:migrate
pm2 restart ticket-backend --update-env
pm2 restart ticket-whatsapp --update-env

cd ../frontend
npm install
npm run build
pm2 restart ticket-frontend --update-env

pm2 save
```

Depois da implantação:

```bash
curl http://127.0.0.1:6200/api/health
curl -I http://127.0.0.1:6201
sudo nginx -t
```

O Nginx deve encaminhar `/ficheiros/` para o backend. Caso contrário, o frontend pode responder com `index.html` e os logótipos não serão exibidos.

## Segurança

- Não publique `.env`.
- Não copie `backend/.dados/whatsapp` entre servidores sem necessidade.
- Troque todas as credenciais dos seeders em ambientes públicos.
- Use HTTPS.
- Mantenha `OTP_EXIBIR_CODIGO=false` fora do desenvolvimento.
- Restrinja o MySQL à rede local da VPS.
- Não aumente limites globais do MySQL para compensar consumo de prepared statements.
- Faça cópias de segurança da base de dados e de `backend/.dados/empresas`.
- Execute migrations antes de reiniciar a aplicação.
- Confirme que existe somente um trabalhador WhatsApp usando a sessão.

## Licença e finalidade

Projeto académico desenvolvido para demonstrar engenharia de software, arquitetura em camadas, padrões de projeto, sistemas multiempresa, comunicação em tempo real, integração WhatsApp, inteligência artificial controlada e emissão de documentos.
