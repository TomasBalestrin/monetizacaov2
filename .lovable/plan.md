

# Adicionar Funil "Reels magnético" para Jaque

## O que precisa ser feito

Inserir um registro semente na tabela `sdr_metrics` para a SDR Jaque com o funil "Reels magnético". Isso fara com que o funil apareca automaticamente no seletor de funis do formulario de metricas e na pagina de detalhe da Jaque.

## Como funciona

O sistema atual descobre os funis disponiveis consultando valores unicos da coluna `funnel` em `sdr_metrics` para cada SDR. Nao existe uma tabela separada de funis. Portanto, basta inserir um registro com valores zerados para o funil aparecer.

## Execucao

Uma unica query SQL via migracao:

```sql
INSERT INTO public.sdr_metrics (sdr_id, date, funnel, activated, scheduled, scheduled_rate, scheduled_same_day, attended, attendance_rate, sales, conversion_rate, source)
VALUES (
  '35bbbb76-8acf-49af-bfb6-7e73ff23ea77',
  '2026-02-01',
  'Reels magnético',
  0, 0, 0, 0, 0, 0, 0, 0,
  'manual'
);
```

## Resultado

Apos a insercao:
- O funil "Reels magnetico" aparecera no seletor de funis ao selecionar Jaque no formulario de metricas
- A pagina de detalhe da Jaque mostrara "Reels magnetico" no filtro de funil
- Os funis da Jaque serao: MPM, Reels magnetico, Teste

Nenhum arquivo de codigo precisa ser alterado.

