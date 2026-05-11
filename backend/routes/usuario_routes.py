# backend/routes/usuario_routes.py

from flask import Blueprint, request, jsonify
import mysql.connector
from config.db_config import Config

usuario_bp = Blueprint('usuario', __name__)

def get_db_connection():
    return mysql.connector.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        port=Config.DB_PORT
    )

# ==========================================
# 1. LISTAR USUÁRIOS (GET)
# ==========================================
@usuario_bp.route('/api/usuarios', methods=['GET'])
def listar_usuarios():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)        
        cursor.execute("SELECT id_usuario, nome, login, perfil FROM Usuario")
        usuarios = cursor.fetchall()
        return jsonify({"status": "sucesso", "dados": usuarios}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

# ==========================================
# 2. CADASTRAR USUÁRIO (POST)
# ==========================================
@usuario_bp.route('/api/usuarios', methods=['POST'])
def cadastrar_usuario():
    dados = request.get_json()
    conn = get_db_connection()
    
    try:
        cursor = conn.cursor()
        comando_sql = "INSERT INTO Usuario (nome, login, senha, perfil) VALUES (%s, %s, %s, %s)"
        valores = (dados['nome'], dados['login'], dados['senha'], dados['perfil'])
        
        cursor.execute(comando_sql, valores)
        conn.commit()
        
        return jsonify({"status": "sucesso", "mensagem": "Usuário criado!", "id": cursor.lastrowid}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"erro": "Este e-mail (login) já está cadastrado no banco."}), 409
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

# ==========================================
# 3. ATUALIZAR USUÁRIO (PUT)
# ==========================================
@usuario_bp.route('/api/usuarios/<id_usuario>', methods=['PUT'])
def atualizar_usuario(id_usuario):
    dados = request.get_json()
    conn = get_db_connection()
    
    try:
        # Trava de segurança: impede editar usuário sem ID oficial do banco
        if str(id_usuario).startswith('u'):
            return jsonify({"erro": "Usuário recém-criado. Dê F5 na página antes de editar."}), 400

        cursor = conn.cursor()
        
        # Pega as informações do JSON que o JavaScript enviou
        nome = dados.get('nome')
        login = dados.get('login')
        perfil = dados.get('perfil')
        senha = dados.get('senha')
        
        if senha: # Se digitou uma senha nova na tela
            sql = "UPDATE Usuario SET nome = %s, login = %s, perfil = %s, senha = %s WHERE id_usuario = %s"
            val = (nome, login, perfil, senha, id_usuario)
        else: # Se deixou a senha em branco (mantém a mesma)
            sql = "UPDATE Usuario SET nome = %s, login = %s, perfil = %s WHERE id_usuario = %s"
            val = (nome, login, perfil, id_usuario)
            
        cursor.execute(sql, val)
        conn.commit()
        
        if cursor.rowcount > 0:
            return jsonify({"status": "sucesso"}), 200
        else:
            return jsonify({"erro": "Usuário não encontrado no banco"}), 404
            
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

# ==========================================
# 4. DELETAR USUÁRIO (DELETE)
# ==========================================
@usuario_bp.route('/api/usuarios/<int:id_usuario>', methods=['DELETE'])
def deletar_usuario(id_usuario):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Usuario WHERE id_usuario = %s", (id_usuario,))
        conn.commit()
        return jsonify({"status": "sucesso"}), 200
    except mysql.connector.IntegrityError:
        return jsonify({"erro": "Usuário possui vistorias cadastradas e não pode ser excluído."}), 409
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()