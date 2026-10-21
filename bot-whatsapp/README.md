# Bot WhatsApp da Viagem Bus

A base original foi reduzida e integrada em `backend/src/integrations/whatsapp` para garantir uma única sessão Baileys ligada ao painel administrativo.

O bot executa somente estas tarefas:

- apresentar o QR Code no painel e manter a sessão ligada;
- entregar códigos OTP de criação de conta;
- entregar avisos manuais sobre uma viagem;
- avisar automaticamente os passageiros quando uma viagem é cancelada;
- repetir mensagens que falharam sem bloquear a API.

As funcionalidades da base anterior relacionadas com grupos, vendas, comprovativos, IA, comandos administrativos e moderação não são utilizadas. A execução é feita juntamente com o backend através de `npm start` ou `npm run dev` na pasta `backend`; não deve ser iniciado um segundo processo Baileys nesta pasta, pois duas ligações poderiam disputar a mesma sessão.

As credenciais da sessão ficam em `backend/.dados/whatsapp` e os envios ficam persistidos na tabela `envios_whatsapp`.
