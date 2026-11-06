# Bot da FambaTicket

A base original foi reduzida e integrada em `backend/src/integrations/whatsapp`. A execução isolada é feita por `backend/src/workers/whatsapp.worker.js`, sob gestão do PM2, para garantir uma única sessão Baileys ligada ao painel administrativo.

O bot executa somente estas tarefas:

- verificar, criar ou reiniciar automaticamente a instância `viagem-bus-whatsapp` no PM2;
- apresentar o QR Code no painel e manter a sessão ligada;
- entregar códigos OTP de criação de conta;
- entregar avisos manuais sobre uma viagem;
- avisar automaticamente os passageiros quando uma viagem é cancelada;
- repetir mensagens que falharam sem bloquear a API.

As funcionalidades da base anterior relacionadas com grupos, vendas, comprovativos, IA, comandos administrativos e moderação não são utilizadas. O backend é iniciado normalmente e o botão **Iniciar bot** cria a instância PM2 quando necessário. Não deve ser iniciado outro processo Baileys manualmente, pois duas ligações poderiam disputar a mesma sessão.

As credenciais da sessão ficam em `backend/.dados/whatsapp` e os envios ficam persistidos na tabela `envios_whatsapp`.
