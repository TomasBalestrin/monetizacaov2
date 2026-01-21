-- Deletar métricas de closers que serão removidos
DELETE FROM metrics 
WHERE closer_id IN (
  SELECT id FROM closers 
  WHERE name IN (
    'DEYVID', 'CARLOS ', 'HANNAH',
    'SDR - CLARA', 'SDR - DIENI', 'SDR - JAQUE', 'SDR - NATHI', 'SDR - THALI',
    'TOTAL SQUAD EAGLE', 'TOTAL SQUAD ALCATEIA', 'TOTAL SQUAD LEANDRO.', 
    'TOTAL CLOSER COMERCIAL', 'ASCENÇÃO CS'
  )
);

-- Deletar closers incorretos (duplicatas, SDRs e totais)
DELETE FROM closers 
WHERE name IN (
  'DEYVID', 'CARLOS ', 'HANNAH',
  'SDR - CLARA', 'SDR - DIENI', 'SDR - JAQUE', 'SDR - NATHI', 'SDR - THALI',
  'TOTAL SQUAD EAGLE', 'TOTAL SQUAD ALCATEIA', 'TOTAL SQUAD LEANDRO.', 
  'TOTAL CLOSER COMERCIAL', 'ASCENÇÃO CS'
);