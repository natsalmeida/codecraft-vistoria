# backend/routes/vistoria_routes.py

from flask import Blueprint, request, jsonify
import mysql.connector
from config.db_config import Config

vistoria_bp = Blueprint('vistoria', __name__)

def get_db_connection():
    return mysql.connector.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        port=Config.DB_PORT
    )

# ==========================================
# 1. ABRIR VISTORIA (Saída do Veículo) - POST
# ==========================================
@vistoria_bp.route('/api/vistorias', methods=['POST'])
def abrir_vistoria():
    dados = request.get_json()
    conn = get_db_connection()
    
    try:
        cursor = conn.cursor()
        
        # 1º Passo: Inserir a Vistoria Principal
        
        condutor = dados.get('condutor', 'Não informado')
        rota = dados.get('rota', 'Não informada')
                
        sql_vistoria = """
            INSERT INTO Vistoria 
            (placa_veiculo, id_usuario_vistoriador, data_vistoria, hr_saida, hodometro_inicial, combustivel_inicial, condutor, rota, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Aberta')
        """
        
        valores_vistoria = (
            dados['placa_veiculo'], dados['id_usuario_vistoriador'], 
            dados['data_vistoria'], dados['hr_saida'], 
            dados['hodometro_inicial'], dados['combustivel_inicial'],
            condutor, rota
        )
        
        cursor.execute(sql_vistoria, valores_vistoria)
                
        id_vistoria_gerado = cursor.lastrowid
        
        # 2º Passo: Inserir os Itens do Checklist vinculados a essa vistoria
        if 'checklist' in dados:           
            sql_checklist = "INSERT INTO Item_Checklist (id_vistoria, id_equipamento, presente, quantidade) VALUES (%s, %s, %s, %s)"
    
            for item in dados['checklist']:              
                quantidade_item = item.get('quantidade', 1)
        
                valores_item = (id_vistoria_gerado, item['id_equipamento'], item['presente'], quantidade_item)
        
                cursor.execute(sql_checklist, valores_item)
        
        conn.commit()
        
        return jsonify({
            "status": "sucesso", 
            "mensagem": "Vistoria aberta com sucesso!",
            "id_vistoria": id_vistoria_gerado
        }), 201

    except Exception as e:
        # Se der erro em qualquer parte, desfaz tudo (Rollback)
        if conn: conn.rollback()
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

# ==========================================
# 3. FECHAR VISTORIA (Saída/Retorno) - PUT
# ==========================================
@vistoria_bp.route('/api/vistorias/<int:id_vistoria>/fechar', methods=['PUT'])
def fechar_vistoria(id_vistoria):
    dados = request.get_json()
    conn = get_db_connection()
    if conn is None:
        return jsonify({"erro": "Erro de conexão com o banco"}), 500
        
    try:
        cursor = conn.cursor()
 
        sql_fechar = """
            UPDATE Vistoria 
            SET hr_retorno = %s, hodometro_final = %s, combustivel_final = %s, 
                avarias = %s, id_usuario_fechamento = %s, status = 'Fechada'
            WHERE id_vistoria = %s AND status = 'Aberta'
        """
        valores = (
            dados['hr_retorno'], 
            dados['hodometro_final'], 
            dados['combustivel_final'], 
            dados.get('avarias', ''), 
            dados['id_usuario_fechamento'], 
            id_vistoria
        )
        
        cursor.execute(sql_fechar, valores)
        conn.commit()
        
        if cursor.rowcount > 0:
            return jsonify({"status": "sucesso", "mensagem": "Vistoria fechada!"}), 200
        else:
            return jsonify({"erro": "Vistoria não encontrada ou já fechada"}), 404
            
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
# ==========================================
# 3. LISTAR TODAS AS VISTORIAS (Relatório) - GET
# ==========================================
@vistoria_bp.route('/api/vistorias', methods=['GET'])
def listar_vistorias():
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        sql_relatorio = """
            SELECT v.id_vistoria, v.placa_veiculo, 
                   u1.nome AS vistoriador, v.id_usuario_vistoriador,
                   u2.nome AS vistoriador_fechamento, v.id_usuario_fechamento,
                   v.data_vistoria, v.status, v.hodometro_inicial, v.hodometro_final,
                   v.hr_saida, v.combustivel_inicial, v.condutor, v.rota
            FROM Vistoria v
            LEFT JOIN Usuario u1 ON v.id_usuario_vistoriador = u1.id_usuario
            LEFT JOIN Usuario u2 ON v.id_usuario_fechamento = u2.id_usuario
            ORDER BY v.data_vistoria DESC, v.id_vistoria DESC
        """
        cursor.execute(sql_relatorio)
        vistorias = cursor.fetchall()
        return jsonify({"status": "sucesso", "dados": vistorias}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()