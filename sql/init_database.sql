-- Tabela de Atores do Sistema
CREATE TABLE Usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    perfil ENUM('Vistoriador', 'Gestor') NOT NULL,
    login VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL
);

-- Tabela da Frota do Cartório
CREATE TABLE Veiculo (
    placa VARCHAR(10) PRIMARY KEY,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    ano INT,
    condutor VARCHAR(100),
    rota VARCHAR(100),
    orgao_origem VARCHAR(100)
);

-- Tabela de Transações 
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
    FOREIGN KEY (placa_veiculo) REFERENCES Veiculo(placa),
    FOREIGN KEY (id_usuario_vistoriador) REFERENCES Usuario(id_usuario)
);

-- Tabela de Itens de Checklist (Normalizada)
CREATE TABLE Item_Checklist (
    id_vistoria INT NOT NULL,
    id_equipamento INT NOT NULL,
    presente BOOLEAN NOT NULL,
    observacao VARCHAR(255),
    PRIMARY KEY (id_vistoria, id_equipamento),
    FOREIGN KEY (id_vistoria) REFERENCES Vistoria(id_vistoria),
    FOREIGN KEY (id_equipamento) REFERENCES Equipamento(id_equipamento)
);


-- População de Base
INSERT INTO Usuario (nome, perfil, login, senha) VALUES 
('Nathalie Soares', 'Gestor', 'nathalie.gestor', 'hash123'),
('Marciel Gomes', 'Vistoriador', 'marciel.vist', 'hash456');

INSERT INTO Equipamento (nome_equipamento) VALUES ('Estepe'), ('Macaco'), ('Chave de Roda');

INSERT INTO Veiculo (placa, marca, modelo, ano) VALUES ('QTO1234', 'Fiat', 'Toro', 2022);

-- Registro de uma Vistoria de Saída (Fase 1)
INSERT INTO Vistoria (placa_veiculo, id_usuario_vistoriador, data_vistoria, hr_saida, hodometro_inicial, combustivel_inicial)
VALUES ('QTO1234', 2, '2024-05-23', '07:00:00', 15000, 'Full');

-- Vinculando Itens de Checklist para a Vistoria ID 1
INSERT INTO Item_Checklist (id_vistoria, id_equipamento, presente) VALUES (1, 1, TRUE), (1, 2, TRUE), (1, 3, FALSE);


-- Relatório Consolidado: Saída vs Retorno
SELECT 
    v.placa_veiculo,
    v.hodometro_inicial,
    v.hodometro_final,
    (v.hodometro_final - v.hodometro_inicial) AS km_percorrida,
    v.combustivel_inicial,
    v.combustivel_final,
    u.nome AS vistoriador
FROM Vistoria v
JOIN Usuario u ON v.id_usuario_vistoriador = u.id_usuario
WHERE v.status = 'Fechada';