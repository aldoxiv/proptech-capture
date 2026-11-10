import json
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
# Liberação ampla de CORS para o React conseguir enviar dados de salvamento
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/api/imoveis', methods=['GET'])
def obter_imoveis():
    if os.path.exists("imoveis.exemplo.json"):
        with open("imoveis.exemplo.json", "r", encoding="utf-8") as f:
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
