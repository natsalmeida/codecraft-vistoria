# backend/routes/veiculo_routes.py

from flask import Blueprint, request, jsonify
import mysql.connector
from config.db_config import Config

# Criação do Blueprint chamado 'veiculo'
veiculo_bp = Blueprint('veiculo', __name__)

def get_db_connection():
    """Função auxiliar para conectar ao banco de dados"""
    return mysql.connector.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        port=Config.DB_PORT
    )

# ==========================================
# 1. READ ALL (Listar toda a frota) - GET
# ==========================================
@veiculo_bp.route('/api/veiculos', methods=['GET'])
def listar_veiculos():
    conn = get_db_connection()
    if conn is None:
        return jsonify({"erro": "Erro de conexão com o banco de dados"}), 500
        
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Veiculo;")
        veiculos = cursor.fetchall()
        return jsonify({"status": "sucesso", "dados": veiculos}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ==========================================
# 2. READ ONE (Buscar um veículo pela placa) - GET
# ==========================================
@veiculo_bp.route('/api/veiculos/<placa>', methods=['GET'])
def buscar_veiculo(placa):
    conn = get_db_connection()
    if conn is None:
        return jsonify({"erro": "Erro de conexão com o banco"}), 500
        
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Veiculo WHERE placa = %s", (placa,))
        veiculo = cursor.fetchone()
        
        if veiculo:
            return jsonify({"status": "sucesso", "dados": veiculo}), 200
        else:
            return jsonify({"erro": "Veículo não encontrado"}), 404
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

# ==========================================
# 3. CREATE (Cadastrar novo veículo) - POST
# ==========================================
@veiculo_bp.route('/api/veiculos', methods=['POST'])
def cadastrar_veiculo():
    dados = request.get_json()
    
    # Validação simples
    campos_obrigatorios = ['placa', 'marca', 'modelo', 'ano']
    for campo in campos_obrigatorios:
        if campo not in dados:
            return jsonify({"erro": f"O campo {campo} é obrigatório"}), 400
            
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        comando_sql = """
            INSERT INTO Veiculo (placa, marca, modelo, ano, condutor, rota, orgao_origem, combustivel, tipo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        valores = (
            dados['placa'], dados['marca'], dados['modelo'], dados['ano'],
            dados.get('condutor', None), dados.get('rota', None), dados.get('orgao_origem', None),
            dados.get('combustivel', None), dados.get('tipo', None)
        )
        cursor.execute(comando_sql, valores)
        conn.commit() # Salva a alteração no banco
        
        return jsonify({"status": "sucesso", "mensagem": "Veículo cadastrado com sucesso!"}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"erro": "Já existe um veículo cadastrado com esta placa"}), 409
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

# ==========================================
# 4. UPDATE (Atualizar dados do veículo) - PUT
# ==========================================
@veiculo_bp.route('/api/veiculos/<placa>', methods=['PUT'])
def atualizar_veiculo(placa):
    dados = request.get_json()
    conn = get_db_connection()
    
    try:
        cursor = conn.cursor()
        # Atualiza também marca, modelo, ano, orgao_origem, combustivel e tipo
        comando_sql = """
            UPDATE Veiculo 
            SET marca = %s, modelo = %s, ano = %s, orgao_origem = %s, combustivel = %s, tipo = %s 
            WHERE placa = %s
        """
        valores = (
            dados.get('marca'), dados.get('modelo'), dados.get('ano'), 
            dados.get('orgao_origem'), dados.get('combustivel'), dados.get('tipo'), 
            placa
        )
        
        cursor.execute(comando_sql, valores)
        conn.commit()
        
        if cursor.rowcount > 0:
            return jsonify({"status": "sucesso", "mensagem": "Veículo atualizado com sucesso"}), 200
        else:
            return jsonify({"erro": "Veículo não encontrado ou dados iguais"}), 404
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

# ==========================================
# 5. DELETE (Remover um veículo) - DELETE
# ==========================================
@veiculo_bp.route('/api/veiculos/<placa>', methods=['DELETE'])
def deletar_veiculo(placa):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Veiculo WHERE placa = %s", (placa,))
        conn.commit()
        
        if cursor.rowcount > 0:
            return jsonify({"status": "sucesso", "mensagem": "Veículo removido com sucesso"}), 200
        else:
            return jsonify({"erro": "Veículo não encontrado"}), 404
    except mysql.connector.IntegrityError:
        return jsonify({"erro": "Não é possível excluir um veículo que já possui vistorias cadastradas"}), 409
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()