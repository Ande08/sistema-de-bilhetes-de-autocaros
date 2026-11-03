const caminhos = {
  inicio: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V21h13V10.5M9 21v-6h6v6"/></>,
  viagens: <><path d="M6 7h12l2 5v7H4v-7l2-5Z"/><path d="M7 7V4h10v3M4 14h16M7 19v2M17 19v2"/></>,
  bilhete: <path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Zm8 0v12"/>,
  cartao: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></>,
  utilizador: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>, pesquisa: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  sino: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>, relogio: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
  assento: <><path d="M7 4v9h10V8a3 3 0 0 0-3-3h-3"/><path d="M5 12H3v5h16v-5h2M6 17v4M18 17v4"/></>, confirmado: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  seta: <path d="m9 18 6-6-6-6"/>, baixo: <path d="m7 10 5 5 5-5"/>, menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  escudo: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></>,
  suporte: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14H2v5h4v-7M20 14h2v5h-4v-7M18 20c-1 1-3 1-5 1"/></>,
  ajuda: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a3 3 0 1 1 4 2.8c-1 .5-1.5 1-1.5 2.2M12 18h.01"/></>, documento: <><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  alerta: <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
  localizacao: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  olho: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  olhoFechado: <><path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.8M6.3 6.3C3.9 8 2.5 12 2.5 12s3.5 6 9.5 6c1.5 0 2.8-.4 4-1"/></>,
  autocarro: <><rect x="5" y="3" width="14" height="18" rx="4"/><path d="M7 7h10v6H7zM8 17h.01M16 17h.01M7 21v2M17 21v2"/></>,
  autocarroGrande: <><path d="M3 7h45c8 0 13 4 14 12l2 12H3V7Z"/><path d="M10 11h31v10H10zM46 11h8l4 10H46zM3 24h61M14 31a6 6 0 1 0 12 0M48 31a6 6 0 1 0 12 0"/></>
};

export default function Icone({ nome }) {
  const grande = nome === 'autocarroGrande';
  return <svg viewBox={grande ? '0 0 68 40' : '0 0 24 24'} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={grande ? '1.4' : '1.8'} strokeLinecap="round" strokeLinejoin="round">{caminhos[nome]}</svg>;
}
