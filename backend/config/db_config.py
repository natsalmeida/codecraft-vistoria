# backend/config/db_config.py

import os

class Config:
    """Configurações base do Banco de Dados"""
    
    DB_TYPE = "mysql" 
    
    # Credenciais
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "Mysql!0308")
    DB_NAME = os.getenv("DB_NAME", "codecraft_vistoria")
    DB_PORT = os.getenv("DB_PORT", "3306")

    # String de conexão SQLAlchemy 
    SQLALCHEMY_DATABASE_URI = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"