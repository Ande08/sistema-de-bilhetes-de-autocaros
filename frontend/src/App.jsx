import { useState } from 'react';
import PesquisaViagens from './componentes/PesquisaViagens.jsx';
import ListaViagens from './componentes/ListaViagens.jsx';
import { pesquisarViagens } from './servicos/api.js';

export default function App() {
  const [viagens, setViagens] = useState([]);
  const [mensagem, setMensagem] = useState('');

  async function pesquisar(filtros) {
    try {
      setMensagem('A pesquisar viagens...');
      setViagens(await pesquisarViagens(filtros));
      setMensagem('');
    } catch (erro) {
      setMensagem(erro.message);
    }
  }

  return (
    <main className="pagina">
      <header><p className="marca">Sistema de Bilhetes</p><h1>Encontre a sua próxima viagem</h1><p>Consulte viagens interprovinciais de forma simples e segura.</p></header>
      <PesquisaViagens aoPesquisar={pesquisar} />
      {mensagem && <p className="aviso">{mensagem}</p>}
      <ListaViagens viagens={viagens} aoSelecionar={() => setMensagem('A seleção de assentos será apresentada na próxima etapa.')} />
    </main>
  );
}
