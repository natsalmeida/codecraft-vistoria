# backend/routes/auth_routes.py

from flask import Blueprint, request, jsonify
import mysql.connector
from config.db_config import Config

# Criação do Blueprint chamado 'auth'
auth_bp = Blueprint('auth', __name__)

def get_db_connection():
    """Função auxiliar para conectar ao banco de dados"""
    return mysql.connector.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        port=Config.DB_PORT
    )

@auth_bp.route('/api/login', methods=['POST'])
def login():
    # Front-end vai enviar o login e a senha em formato JSON
    dados = request.get_json()
    
    if not dados or not 'login' in dados or not 'senha' in dados:
        return jsonify({"erro": "Login e senha são obrigatórios"}), 400
        
    usuario_login = dados['login']
    usuario_senha = dados['senha']
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({"erro": "Erro de conexão com o banco de dados"}), 500
        
    try:
        cursor = conn.cursor(dictionary=True)
        # Busca o usuário no banco de dados
        comando_sql = "SELECT id_usuario, nome, perfil FROM Usuario WHERE login = %s AND senha = %s"
        cursor.execute(comando_sql, (usuario_login, usuario_senha))
        usuario = cursor.fetchone() # Pega apenas o primeiro resultado
        
        if usuario:
            # Login deu certo!
            return jsonify({
                "status": "sucesso",
                "mensagem": f"Bem-vindo(a), {usuario['nome']}!",
                "usuario": usuario
            }), 200
        else:
            # Login ou senha errados
            return jsonify({"erro": "Credenciais inválidas"}), 401
            
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    
    return jsonify({"status": "sucesso", "mensagem": "Logout realizado com sucesso"}), 200