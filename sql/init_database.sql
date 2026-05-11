-- ==========================================
-- CodeCraft Vistoria - Script de Inicialização 
-- ==========================================

CREATE DATABASE IF NOT EXISTS codecraft_vistoria;
USE codecraft_vistoria;

-- 1. Tabela de Atores do Sistema
CREATE TABLE Usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    perfil ENUM('Vistoriador', 'Gestor') NOT NULL,
    login VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL
);

-- 2. Tabela da Frota do Cartório
CREATE TABLE Veiculo (
    placa VARCHAR(10) PRIMARY KEY,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT,
    condutor VARCHAR(100),
    rota VARCHAR(100),
    orgao_origem VARCHAR(100),
    combustivel VARCHAR(30) DEFAULT 'Flex',
    tipo VARCHAR(30) DEFAULT 'requisitado'
);

-- 3. Tabela de Equipamentos e Acessórios
CREATE TABLE Equipamento (
    id_equipamento INT AUTO_INCREMENT PRIMARY KEY,
    nome_equipamento VARCHAR(50) NOT NULL
);

-- 4. Tabela Principal de Transações (Vistorias)
CREATE TABLE Vistoria (
    id_vistoria INT AUTO_INCREMENT PRIMARY KEY,
    placa_veiculo VARCHAR(10) NOT NULL,
    id_usuario_vistoriador INT NOT NULL,
    data_vistoria DATE NOT NULL,
    hr_saida TIME NOT NULL,
    hr_retorno TIME,
    hodometro_inicial INT NOT NULL,
    hodometro_final INT,
    combustivel_inicial VARCHAR(20) NOT NULL,
    combustivel_final VARCHAR(20),
    status ENUM('Aberta', 'Fechada') DEFAULT 'Aberta',
    avarias TEXT,
    url_fotos_json TEXT,
    assinatura_fiscal BLOB,
    assinatura_motorista BLOB,
    condutor VARCHAR(100),
    rota VARCHAR(100),
    id_usuario_fechamento INT,
    FOREIGN KEY (placa_veiculo) REFERENCES Veiculo(placa),
    FOREIGN KEY (id_usuario_vistoriador) REFERENCES Usuario(id_usuario),
    FOREIGN KEY (id_usuario_fechamento) REFERENCES Usuario(id_usuario)
);

-- 5. Tabela de Itens de Checklist (Relação N:M)
CREATE TABLE Item_Checklist (
    id_vistoria INT NOT NULL,
    id_equipamento INT NOT NULL,
    presente BOOLEAN NOT NULL,
    quantidade INT DEFAULT 1,
    observacao VARCHAR(255),
    PRIMARY KEY (id_vistoria, id_equipamento),
    FOREIGN KEY (id_vistoria) REFERENCES Vistoria(id_vistoria) ON DELETE CASCADE,
    FOREIGN KEY (id_equipamento) REFERENCES Equipamento(id_equipamento) ON DELETE CASCADE
);

-- ==========================================
-- População de Base (Inserts Iniciais)
-- ==========================================

-- Inserindo Usuários
INSERT INTO Usuario (id_usuario, nome, perfil, login, senha) VALUES 
(1, 'Nathalie Soares', 'Gestor', 'nathalie.almeida@tre-to.jus.br', 'hash123'),
(2, 'Marciel Gomes', 'Vistoriador', 'marciel.rodrigues@tre-to.jus.br', 'hash456');

-- Inserindo Veículos
INSERT INTO Veiculo (placa, marca, modelo, ano, condutor, rota, orgao_origem, combustivel, tipo) VALUES 
('ABC1234', 'Renault', 'Sandero', 2026, 'Artur', 'Gato', 'Câmara', 'Gasolina', 'requisitado');

-- Inserindo Equipamentos Padrão
INSERT INTO Equipamento (id_equipamento, nome_equipamento) VALUES 
(1, 'Estepe'),
(2, 'Macaco'),
(3, 'Chave de Roda'),
(4, 'Extintor'),
(5, 'Triângulo'),
(6, 'Calotas'),
(7, 'Tapetes'),
(8, 'Rádio'),
(9, 'Documentos'),
(10, 'Travessa Capota'),
(11, 'Capota'),
(12, 'Antena'),
(13, 'Cartão Combustível');

-- Relatório Consolidado Útil para Testes do Gestor
-- (Pode ser rodado manualmente no Workbench para conferência)
/*
SELECT 
    v.id_vistoria,
    v.placa_veiculo,
    u1.nome AS vistoriador_saida,
    u2.nome AS vistoriador_retorno,
    v.hodometro_inicial,
    v.hodometro_final,
    (v.hodometro_final - v.hodometro_inicial) AS km_percorrida,
    v.status
FROM Vistoria v
LEFT JOIN Usuario u1 ON v.id_usuario_vistoriador = u1.id_usuario
LEFT JOIN Usuario u2 ON v.id_usuario_fechamento = u2.id_usuario;
*/