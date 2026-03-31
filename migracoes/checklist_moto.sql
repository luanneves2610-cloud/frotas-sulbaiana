-- ── Melhoria: Checklist de Moto ──────────────────────────────────────────
-- 1. Adiciona tipo_veiculo, vistoriador e local_vistoria à execução
ALTER TABLE checklist_execucoes
  ADD COLUMN IF NOT EXISTS tipo_veiculo   TEXT DEFAULT 'carro',
  ADD COLUMN IF NOT EXISTS vistoriador    TEXT,
  ADD COLUMN IF NOT EXISTS local_vistoria TEXT,
  ADD COLUMN IF NOT EXISTS ano_fabricacao TEXT;

-- 2. Adiciona tipo_veiculo aos itens (para filtrar carro/moto)
ALTER TABLE checklist_itens
  ADD COLUMN IF NOT EXISTS tipo_veiculo TEXT DEFAULT 'carro';

-- 3. Marca todos os itens existentes como sendo de carro
UPDATE checklist_itens SET tipo_veiculo = 'carro' WHERE tipo_veiculo IS NULL;

-- 4. Insere os 21 itens do checklist de MOTO
INSERT INTO checklist_itens (descricao, categoria, ordem, ativo, tipo_veiculo) VALUES
  -- Documentação
  ('CRLV / Documento do veículo em dia',         'Documentação',  1,  true, 'moto'),
  ('CNH do motorista válida',                     'Documentação',  2,  true, 'moto'),
  ('Seguro vigente',                              'Documentação',  3,  true, 'moto'),
  -- Pneus
  ('Pneu dianteiro — calibragem e estado',        'Pneus',         4,  true, 'moto'),
  ('Pneu traseiro — calibragem e estado',         'Pneus',         5,  true, 'moto'),
  -- Iluminação
  ('Farol alto',                                  'Iluminação',    6,  true, 'moto'),
  ('Farol baixo',                                 'Iluminação',    7,  true, 'moto'),
  ('Lanterna traseira',                           'Iluminação',    8,  true, 'moto'),
  -- Setas
  ('Seta dianteira esquerda',                     'Setas',         9,  true, 'moto'),
  ('Seta dianteira direita',                      'Setas',         10, true, 'moto'),
  ('Seta traseira esquerda',                      'Setas',         11, true, 'moto'),
  ('Seta traseira direita',                       'Setas',         12, true, 'moto'),
  -- Conservação
  ('Assento (banco)',                             'Conservação',   13, true, 'moto'),
  ('Conservação da lataria',                      'Conservação',   14, true, 'moto'),
  ('Conservação da pintura',                      'Conservação',   15, true, 'moto'),
  ('Veículo está com adesivo do contrato',        'Conservação',   16, true, 'moto'),
  -- Mecânica
  ('Nível de óleo do motor',                      'Mecânica',      17, true, 'moto'),
  ('Freios funcionando corretamente',             'Mecânica',      18, true, 'moto'),
  ('Buzina funcionando',                          'Mecânica',      19, true, 'moto'),
  -- Acessórios
  ('Retrovisor esquerdo',                         'Acessórios',    20, true, 'moto'),
  ('Retrovisor direito',                          'Acessórios',    21, true, 'moto');
