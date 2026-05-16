# backend/routes/equipamento_routes.py

from flask import Blueprint, request, jsonify
import mysql.connector
from config.db_config import Config

# Cria o Blueprint para as rotas de equipamentos
equipamento_bp = Blueprint('equipamento_routes', __name__)

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

# ==========================================
# ROTA PARA ADICIONAR NOVO EQUIPAMENTO (GESTOR)
# ==========================================
@equipamento_bp.route('/api/equipamentos', methods=['POST'])
def add_equipamento():
    conn = get_db_connection()
    if conn is None:
        return jsonify({"erro": "Erro de conexão com o banco de dados."}), 500
        
    try:
        dados = request.json
        nome_equipamento = dados.get('nome_equipamento')
        
        if not nome_equipamento:
            return jsonify({"erro": "Nome do equipamento é obrigatório"}), 400
            
        cursor = conn.cursor()
        
        # Insere o novo equipamento no banco de dados
        comando = "INSERT INTO Equipamento (nome_equipamento) VALUES (%s)"
        cursor.execute(comando, (nome_equipamento,))
        conn.commit()
        
        return jsonify({
            "mensagem": "Equipamento adicionado com sucesso!", 
            "id_equipamento": cursor.lastrowid
        }), 201
        
    except mysql.connector.Error as err:
        return jsonify({"erro": f"Erro no banco de dados: {err}"}), 500
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()