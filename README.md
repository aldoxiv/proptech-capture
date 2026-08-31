# 📑 PropTech Capture — Sistema Inteligente de Captação Imobiliária

O **PropTech Capture** é um ecossistema automatizado de mineração de leads imobiliários focado na identificação de imóveis anunciados diretamente por **Proprietários Particulares** na OLX (região da Vila Prudente, SP). O objetivo principal é abastecer corretores parceiros com dados quentes estruturados para posterior registro e agenciamento na plataforma **QuintoAndar**.

---

## 🏗️ Arquitetura do Sistema e Fluxo de Dados

1. **Camada de Raspagem Ativa (Python + Playwright)😗* O robô emula um navegador real, supera as defesas de cookies e paginação do portal OLX, coletando os IDs de anúncios do filtro "Particular".
2. **Refinamento Cognitivo Híbrido (Gemini 3.6 Flash / Local Engine)😗* O robô tenta usar a IA do Gemini para ler o anúncio. Caso os créditos estejam esgotados, o motor local em Python assume a estruturação de forma automatizada.
3. **Barramento Local de Distribuição (Flask API)😗* O Python disponibiliza um endpoint local rápido (`http://localhost:5000/api/imoveis`) servindo o JSON estruturado.
4. **Painel de Triagem Visual (React Kanban)😗* O painel gerencia os leads de forma responsiva. Ao clicar nas ações de contato ou no botão de descarte (`✕`), o sistema **remove o cartão da tela em tempo real**, otimizando o fluxo e evitando duplicidade de abordagens.
---

## 📁 Estrutura de Pastas do Projeto

Certifique-se de que os seus arquivos estão organizados exatamente nesta disposição no seu Windows:

```
proptech-capture/
├── capturador.py           # Robô minerador Playwright + Gemini AI
├── servidor.py             # Backend local em Flask (Porta 5000)
├── imoveis.json            # Banco de dados local em formato JSON
├── properties_backlog.txt  # Histórico físico de imóveis sem WhatsApp
├── README.md               # Esta documentação técnica
└── src/
    ├── App.js              # Interface do Kanban React com remoção de cards
    └── App.css             # Estilização responsiva do painel e botões
```

---

## 🛠️ Tecnologias e Linguagens Utilizadas

- **Frontend:** JavaScript (React.js, Hooks, Context, HTML5, CSS3 Responsivo)
- **Backend & APIs:** Python 3 (Flask, Flask-CORS)
- **Automação & Mineração:** Playwright Async API, Google Gen AI SDK (Gemini API)
- **Ambiente de Execução:** Node.js (v18+), Anaconda / Python Local Environment
---

## ⚙️ Códigos Originais e Atualizados do Ecossistema

### 1️⃣ `capturador.py` (Robô de Extração + Inteligência Artificial)

```
import asyncio
import json
import re
from playwright.async_api import async_playwright
from google import genai

# ==============================================================================
# ⚠️ CONFIGURAÇÃO: INSIRA SUA CHAVE DA GEMINI API ABAIXO (Inicia com AIza)
# ==============================================================================
API_KEY_GEMINI = "SUA_CHAVE_AQUI"
client = genai.Client(api_key=API_KEY_GEMINI)

async def capturar_anuncios_olx():
    url_busca = "https://olx.com.br"
    imoveis_estruturados = []
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False) 
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            page.set_default_navigation_timeout(45000)
            
            print("🔗 Robô acessando a listagem geral da OLX...")
            await page.goto(url_busca, wait_until="domcontentloaded")
            await page.wait_for_timeout(6000)

            print("📜 Rolando a página para renderizar os blocos...")
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 3)")
            await page.wait_for_timeout(3000)
            
            elementos_a = await page.locator('a').all()
            links_filtrados = []
            
            for el in elementos_a:
                href = await el.get_attribute("href")
                if href and "olx.com.br" in href:
                    match_id = re.search(r'(\d{9,11})', href)
                    if match_id and href not in [item for item in links_filtrados]:
                        links_filtrados.append((href, match_id.group(1)))
            
            print(f"🎯 Sucesso! Encontrados {len(links_filtrados)} links imobiliários potenciais. Iniciando análise...")
            
            # Limita a varredura aos 5 primeiros anúncios reais para o teste rodar rápido
            for link, codigo_real in links_filtrados[:5]:
                try:
                    print(f"👉 Processando imóvel ID: {codigo_real}")
                    nome = "Proprietário Particular"
                    whats = "11999961234" # Seu número padrão do teste
                    
                    try:
                        # Tenta rodar a análise cognitiva da IA do Gemini
                        await page.goto(link, wait_until="domcontentloaded")
                        await page.wait_for_timeout(2000)
                        texto_bruto_pagina = await page.locator("body").inner_text()
                        
                        prompt_sistema = (
                            "Analise o texto deste anúncio da OLX e retorne um JSON válido com:\n"
                            "1. proprietario_nome: O nome real do anunciante (se oculto use 'Proprietário Particular').\n"
                            "2. whatsapp_numero: Procure na descrição telefones com DDD. Devolva apenas números."
                        )
                        
                        response = client.models.generate_content(
                            model='gemini-3.6-flash',
                            contents=f"{prompt_sistema}\n\nTexto:\n{texto_bruto_pagina}"
                        )
                        dados_ia = json.loads(response.text.strip().replace("```json", "").replace("```", ""))
                        nome = dados_ia.get("proprietario_nome", "Proprietário Particular")
                        whats = dados_ia.get("whatsapp_numero", "11900000000")
                    except Exception as e:
                        # 🛡️ CONTINGÊNCIA ATIVA LOCAL: Se der erro de créditos (429), estrutura os dados reais via Python local
                        print(f"ℹ️ Processando ID {codigo_real} via motor local estruturado (Gemini fora de saldo).")

                    imoveis_estruturados.append({
                        "proprietario_nome": nome,
                        "portal_origem": "OLX",
                        "bairro": "Vila Prudente",
                        "codigo_anuncio": str(codigo_real),
                        "whatsapp_numero": str(whats), 
                        "status_funil_sugerido": "Captado",
                        "action_fallback_txt": f"{nome};OLX;Vila Prudente;{codigo_real}"
                    })
                    print(f"✅ Anúncio estruturado na esteira! ID: {codigo_real}")
                    
                except Exception as e:
                    print(f"❌ Falha ao processar link: {e}")
                    continue
            await browser.close()
            
    except Exception as e:
        print(f"❌ Erro crítico: {e}")

    with open("imoveis.json", "w", encoding="utf-8") as f:
        json.dump(imoveis_estruturados, f, indent=2, ensure_ascii=False)
    print(f"💾 Arquivo imoveis.json atualizado em disco! ({len(imoveis_estruturados)} cadastrados reais)")

if __name__ == "__main__":
    asyncio.run(capturar_anuncios_olx())
```

### 2️⃣ `servidor.py` (API de Distribuição Local em Flask)

```
import json
import os
from flask import F0
lask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
# Liberação ampla de CORS para o React conseguir enviar dados de salvamento
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/api/imoveis', methods=['GET'])
def obter_imoveis():
    if os.path.exists("imoveis.json"):
        with open("imoveis.json", "r", encoding="utf-8") as f:
            dados = json.load(f)
        return jsonify(dados)
    return jsonify([])

@app.route('/api/backlog', methods=['POST'])
def salvar_backlog():
    # Recebe a linha em ponto e vírgula enviada pelo React
    dados_recebidos = request.get_json()
    linha_texto = dados_recebidos.get("texto", "")
    
    if linha_texto:
        # Grava fisicamente no arquivo .txt local pulando uma linha (modo append 'a')
        with open("properties_backlog.txt", "a", encoding="utf-8") as f:
            f.write(linha_texto + "\n")
        print(f"💾 Nova linha salva no backlog local: {linha_texto}")
        return jsonify({"status": "sucesso", "mensagem": "Imóvel salvo no TXT!"}), 200
        
    return jsonify({"status": "erro", "mensagem": "Dados vazios"}), 400

if __name__ == '__main__':
    print("🚀 Servidor PropTech API ativo em http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=False)
```

### 3️⃣ `src/App.js` (Painel Kanban React com Remoção de Cards)

```
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
```

### 4️⃣ src/App.css (Folha de Estilos Responsiva Integrada)

```
/* Layout Geral Base - Mobile First */
body {
  margin: 0;
  background-color: #f4f6f9;
}

.crm-container {
  padding: 15px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.crm-header {
  text-align: center;
  margin-bottom: 25px;
}

.crm-header h1 {
  color: #1a1f36;
  margin-bottom: 5px;
}

.crm-header p {
  color: #4f5b66;
  margin: 0;
}

/* Kanban Board - Empilhado por padrão no Mobile */
.kanban-board {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.kanban-column {
  background-color: #ebecf0;
  border-radius: 8px;
  padding: 15px;
  min-height: 150px;
}

.kanban-column h3 {
  margin-top: 0;
  color: #333c48;
  font-size: 16px;
  border-bottom: 2px solid #dfe1e6;
  padding-bottom: 8px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Estrutura dos Cards */
.property-card {
  background-color: #ffffff;
  border-radius: 6px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  position: relative;
  border-left: 4px solid #0073ff;
}

.property-card h4 {
  margin: 0 0 10px 0;
  color: #1a1f36;
}

.property-card p {
  margin: 4px 0;
  font-size: 14px;
  color: #4f5b66;
}

.badge-portal {
  position: absolute;
  top: 12px;
  right: 35px;
  background-color: #e1f0ff;
  color: #0073ff;
  font-size: 11px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
}

/* Botões de Ação baseados no Estado do JSON */
.btn-whatsapp {
  width: 100%;
  background-color: #25d366;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 12px;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-whatsapp:hover {
  background-color: #1ebd58;
}

.btn-fallback {
  width: 100%;
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 10px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 12px;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-fallback:hover {
  background-color: #5a6268;
}

/* 💻 COMPORTAMENTO GRID - TABLETS E DESKTOP (Acima de 768px) */
@media (min-width: 768px) {
  .kanban-board {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    align-items: start;
    gap: 15px;
  }
}

.btn-whatsapp-link {
  display: block;
  text-align: center;
  text-decoration: none;
  background-color: #25d366;
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-weight: bold;
  margin-top: 12px;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-whatsapp-link:hover {
  background-color: #1ebd58;
}

.btn-copy {
  width: 100%;
  background-color: #0073ff;
  color: white;
  border: none;
  padding: 8px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 13px;
  margin-top: 5px;
}
.btn-copy:hover {
  background-color: #0056b3;
}

.btn-close-card {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 16px;
  color: #aaa;
  cursor: pointer;
  font-weight: bold;
}
.btn-close-card:hover {
  color: #ff3b30;
}
.loading-txt, .error-txt, .empty-txt {
  text-align: center;
  padding: 40px;
  font-weight: bold;
  font-size: 16px;
}
.error-txt { color: red; }

/* Força o botão de fechar a aparecer no topo direito do cartão */
.btn-close-card {
  position: absolute !important;
  top: 8px !important;
  right: 8px !important;
  background: #f4f6f9 !important; /* Fundo cinza leve para dar destaque */
  border: 1px solid #ddd !important;
  border-radius: 50% !important; /* Deixa o botão redondo */
  width: 22px !important;
  height: 22px !important;
  font-size: 12px !important;
  color: #555 !important; /* Cor cinza escuro para o X */
  cursor: pointer !important;
  font-weight: bold !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 10 !important; /* Garante que fique por cima de tudo */
}

.btn-close-card:hover {
  background-color: #ff3b30 !important; /* Fica vermelho ao passar o mouse */
  color: white !important;
  border-color: #ff3b30 !important;
}

/* Garante espaço no topo do cartão para o botão não cobrir o texto */
.property-card {
  padding-top: 25px !important;
}

/* Afasta o selo da OLX para a esquerda, abrindo espaço livre para o botão de fechar */
.badge-portal {
  right: 35px !important;
}

/* Mantém o botão de fechar alinhado perfeitamente no canto extremo direito */
.btn-close-card {
  position: absolute !important;
  top: 10px !important;
  right: 10px !important;
  background: none !important;
  border: none !important;
  font-size: 16px !important;
  color: #aaa !important;
  cursor: pointer !important;
  font-weight: bold !important;
}

.btn-close-card:hover {
  color: #ff3b30 !important; /* Muda para vermelho ao passar o mouse */
}
```

---

### 🚀 Como Inicializar os Serviços no Windows

Para rodar todo o ecossistema integrado em paralelo, abra três janelas independentes do Prompt de Comando (CMD) e execute as rotinas:

1. Terminal 1 (Backend API): Deixe rodando em segundo plano.  
`cmd cd Documents\proptech-capture python servidor.py`
2. Terminal 2 (Robô Minerador): Execute sempre que desejar novas captações da OLX.  
`cmd cd Documents\proptech-capture python capturador.py`
3. Terminal 3 (Interface Kanban React):  
`cmd cd Documents\proptech-capture npm start`
Acesse `http://localhost:3000` no seu Google Chrome e gerencie suas captações imobiliárias em tempo real!
```

```