import React, { useState, useEffect } from 'react';
import './App.css';

const COLUMNS = ["Captado", "Contatado", "Em Negociação", "Cadastrado"];

export default function App() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch('http://localhost:5000/api/imoveis')
      .then(response => {
        if (!response.ok) throw new Error("Erro de conexão");
        return response.json();
      })
      .then(data => {
        setProperties(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setErrorMsg("⚠️ Não foi possível conectar ao servidor Python. Verifique o servidor.py no CMD.");
        setLoading(false);
      });
  }, []);

  // ✕ FUNÇÃO DE REMOÇÃO: Elimina o card do estado visual instantaneamente
  const handleRemoveCard = (codigoAnuncio) => {
    setProperties(prev => prev.filter(p => p.codigo_anuncio !== codigoAnuncio));
  };

  const handleSaveToLocalTxt = (fallbackText, codigo) => {
    fetch('http://localhost:5000/api/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: fallbackText })
    })
    .then(() => {
      alert("💾 Imóvel salvo no backlog físico properties_backlog.txt!");
      handleRemoveCard(codigo); // Remove do painel após salvar
    });
  };

  const handleWhatsAppAction = (numero, mensagem, codigo) => {
    const encodedMessage = encodeURIComponent(mensagem);
    
    // SUA SOLUÇÃO BLINDADA: Garante a barra isolada de forma 100% visível para o JavaScript
    const url = "https://wa.me" + "/" + numero + "/?text=" + encodedMessage;
    
    window.open(url, '_blank');
    handleRemoveCard(codigo); // Remove do painel após iniciar o contato
  };


  return (
    <div className="crm-container">
      <header className="crm-header">
        <h1>PropTech Capture 🏠</h1>
        <p>Consultoria Imobiliária Integrada QuintoAndar</p>
      </header>

      {loading ? (
        <div className="loading-txt">🛰️ O robô em Python está varrendo os anúncios... Aguarde...</div>
      ) : errorMsg ? (
        <div className="error-txt">{errorMsg}</div>
      ) : properties.length === 0 ? (
        <div className="empty-txt">📭 Nenhum anúncio de proprietário particular encontrado no momento.</div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map(column => (
            <div key={column} className="kanban-column">
              <h3>{column} ({properties.filter(p => p.status_funil_sugerido === column).length})</h3>
              
              <div className="card-list">
                {properties
                  .filter(p => p.status_funil_sugerido === column)
                  .map((prop, index) => {
                    const msgWhats = "Olá, " + prop.proprietario_nome + "! Vi seu imóvel na OLX em " + prop.bairro + " (Cód: " + prop.codigo_anuncio + "). Sou parceiro QuintoAndar e tenho clientes interessados. Podemos alinhar?";

                    return (
                      <div key={index} className="property-card">
                        {/* Botão de descarte manual rápido */}
                        <button className="btn-close-card" onClick={() => handleRemoveCard(prop.codigo_anuncio)}>✕</button>
                        
                        <span className="badge-portal">{prop.portal_origem}</span>
                        <h4>{prop.proprietario_nome}</h4>
                        <p>📍 <b>Bairro:</b> {prop.bairro}</p>
                        <p>🆔 <b>Cód:</b> {prop.codigo_anuncio}</p>

                        {prop.whatsapp_numero ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <button className="btn-copy" onClick={() => navigator.clipboard.writeText(msgWhats).then(() => alert("Texto copiado!"))}>📋 1. Copiar Texto</button>
                            <button className="btn-whatsapp-action" onClick={() => handleWhatsAppAction(prop.whatsapp_numero, msgWhats, prop.codigo_anuncio)}>🟢 2. Abrir Conversa</button>
                          </div>
                        ) : (
                          <button className="btn-fallback" onClick={() => handleSaveToLocalTxt(prop.action_fallback_txt, prop.codigo_anuncio)}>💾 Salvar no Backlog Local</button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
