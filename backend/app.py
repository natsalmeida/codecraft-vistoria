# backend/app.py

from flask import Flask, jsonify
from flask_cors import CORS
import mysql.connector
from config.db_config import Config

# IMPORTA O BLUEPRINT DAS ROTAS DE AUTENTICAÇÃO
from routes.auth_routes import auth_bp
from routes.veiculo_routes import veiculo_bp
from routes.vistoria_routes import vistoria_bp

# Inicializa o aplicativo Flask
app = Flask(__name__)
CORS(app)

# REGISTRA AS ROTAS NO APLICATIVO
app.register_blueprint(auth_bp)
app.register_blueprint(veiculo_bp)
app.register_blueprint(vistoria_bp)

def get_db_connection():
    """Função auxiliar para conectar ao banco de dados MySQL"""
    try:
        conn = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            port=Config.DB_PORT
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Erro de conexão: {err}")
        return None

# Rota de teste para verificar se tudo está funcionando
@app.route('/api/teste', methods=['GET'])
def teste_conexao():
    conn = get_db_connection()
    
    # Se a conexão falhar, retorna erro 500 (Internal Server Error)
    if conn is None:
        return jsonify({"erro": "Não foi possível conectar ao banco de dados. Verifique o db_config.py."}), 500
    
    try:
        # O dictionary=True faz com que o resultado venha como JSON/Dicionário e não como tupla
        cursor = conn.cursor(dictionary=True)
        
        # Executa uma consulta simples para buscar os usuários
        cursor.execute("SELECT id_usuario, nome, perfil, login FROM Usuario;")
        usuarios = cursor.fetchall()
        
        # Retorna o resultado com sucesso (Status 200)
        return jsonify({
            "status": "sucesso",
            "mensagem": "Conexão com o banco de dados realizada perfeitamente!",
            "dados": usuarios
        }), 200
        
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
        
    finally:
        # Garante que a conexão será fechada mesmo se der erro
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

# Inicia o servidor localmente na porta 5000
if __name__ == '__main__':
    # debug=True faz com que o servidor reinicie sozinho ao salvar o arquivo
    app.run(debug=True, port=5000)