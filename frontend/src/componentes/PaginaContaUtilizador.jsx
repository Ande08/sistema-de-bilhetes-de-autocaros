import { useState } from 'react';
import Icone from './Icone.jsx';
import { actualizarPerfil, alterarPalavraPasse, solicitarOtpAlteracaoPalavraPasse, solicitarOtpAlteracaoPerfil } from '../servicos/api.js';

export default function PaginaContaUtilizador({ utilizador, aoActualizarUtilizador }) {
  const [pedidoPerfil, setPedidoPerfil] = useState(null);
  const [pedidoSenha, setPedidoSenha] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [aProcessar, setAProcessar] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function solicitarPerfil(evento) {
    evento.preventDefault(); setAProcessar(true); setMensagem(''); setErro('');
    try {
      const pedido = await solicitarOtpAlteracaoPerfil(Object.fromEntries(new FormData(evento.currentTarget)));
      setPedidoPerfil(pedido); setMensagem(pedido.mensagem);
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function confirmarPerfil(evento) {
    evento.preventDefault(); setAProcessar(true); setMensagem(''); setErro('');
    try {
      const actualizado = await actualizarPerfil(Object.fromEntries(new FormData(evento.currentTarget)));
      setPedidoPerfil(null); setMensagem('Informações pessoais atualizadas com sucesso.');
      aoActualizarUtilizador?.(actualizado);
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function solicitarSenha() {
    setAProcessar(true); setMensagem(''); setErro('');
    try { const pedido = await solicitarOtpAlteracaoPalavraPasse(); setPedidoSenha(pedido); setMensagem(pedido.mensagem); }
    catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  async function guardarSenha(evento) {
    evento.preventDefault(); setAProcessar(true); setMensagem(''); setErro('');
    const formulario = evento.currentTarget;
    const valores = Object.fromEntries(new FormData(formulario));
    if (valores.novaPalavraPasse !== valores.confirmarPalavraPasse) {
      setErro('A confirmação da nova palavra-passe não corresponde.'); setAProcessar(false); return;
    }
    try {
      const resposta = await alterarPalavraPasse({ codigo: valores.codigo, novaPalavraPasse: valores.novaPalavraPasse });
      formulario.reset(); setPedidoSenha(null); setMensagem(resposta.mensagem);
    } catch (falha) { setErro(falha.message); }
    finally { setAProcessar(false); }
  }

  return <section className="grelha-perfil pagina-conta-completa">
    <div className="pagina-dados vidro formulario-perfil">
      <p className="etiqueta">Dados pessoais protegidos</p><h3>Informações da conta</h3>
      {!pedidoPerfil ? <form className="formulario-perfil" onSubmit={solicitarPerfil}>
        <label>Nome<input name="nome" defaultValue={utilizador.nome} required minLength="2" maxLength="80" /></label>
        <label>Apelido<input name="apelido" defaultValue={utilizador.apelido} required minLength="2" maxLength="120" /></label>
        <label>Número de telefone<input name="telefone" type="tel" defaultValue={utilizador.telefone} required /></label>
        <small>Para proteger a conta, qualquer alteração só será guardada após confirmar o código enviado ao WhatsApp atual.</small>
        <button className="botao-pesquisar" disabled={aProcessar}>{aProcessar ? 'A enviar código...' : 'Continuar e enviar código'}</button>
      </form> : <form className="formulario-perfil" onSubmit={confirmarPerfil}>
        <p>Confirme a alteração com o código enviado para {pedidoPerfil.telefone}.</p>
        <label>Código recebido<input className="campo-otp" name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required /></label>
        {pedidoPerfil.codigoDemonstracao && <p className="codigo-demonstracao">Código de demonstração: <strong>{pedidoPerfil.codigoDemonstracao}</strong></p>}
        <button className="botao-pesquisar" disabled={aProcessar}>{aProcessar ? 'A confirmar...' : 'Confirmar e guardar dados'}</button>
        <button type="button" className="botao-voltar" disabled={aProcessar} onClick={() => setPedidoPerfil(null)}>Cancelar alteração</button>
      </form>}
    </div>
    <div className="pagina-dados vidro formulario-perfil">
      <p className="etiqueta">Segurança</p><h3>Alterar palavra-passe</h3><p>O código de segurança será enviado para o WhatsApp associado à conta.</p>
      {!pedidoSenha && <button type="button" className="botao-pesquisar" disabled={aProcessar} onClick={solicitarSenha}>{aProcessar ? 'A enviar...' : 'Enviar código pelo WhatsApp'}</button>}
      {pedidoSenha && <form className="formulario-perfil" onSubmit={guardarSenha}>
        <label>Código recebido<input className="campo-otp" name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required /></label>
        {pedidoSenha.codigoDemonstracao && <p className="codigo-demonstracao">Código de demonstração: <strong>{pedidoSenha.codigoDemonstracao}</strong></p>}
        <label>Nova palavra-passe<span className="campo-palavra-passe"><input name="novaPalavraPasse" type={mostrarSenha ? 'text' : 'password'} minLength="8" required /><button type="button" onClick={() => setMostrarSenha((valor) => !valor)}><Icone nome={mostrarSenha ? 'olhoFechado' : 'olho'} /></button></span></label>
        <label>Confirmar palavra-passe<input name="confirmarPalavraPasse" type={mostrarSenha ? 'text' : 'password'} minLength="8" required /></label>
        <button className="botao-pesquisar" disabled={aProcessar}>{aProcessar ? 'A guardar...' : 'Confirmar nova palavra-passe'}</button>
      </form>}
    </div>
    {mensagem && <p className="mensagem-formulario sucesso mensagem-perfil">{mensagem}</p>}
    {erro && <p className="mensagem-formulario erro mensagem-perfil">{erro}</p>}
  </section>;
}
