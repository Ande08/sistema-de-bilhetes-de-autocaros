export default function ListaViagens({ viagens, aoSelecionar }) {
  if (!viagens.length) return <p className="aviso">Nenhuma viagem encontrada.</p>;
  return (
    <section className="lista-viagens">
      {viagens.map((viagem) => (
        <article className="cartao viagem" key={viagem.id}>
          <div><strong>Viagem {viagem.id}</strong><p>Partida: {new Date(viagem.departureAt).toLocaleString('pt-PT')}</p></div>
          <div><strong>{viagem.price} MT</strong><p>Estado: {viagem.status}</p></div>
          <button onClick={() => aoSelecionar(viagem)}>Escolher assento</button>
        </article>
      ))}
    </section>
  );
}
