import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de funis para SDRs (nomes exatos da planilha)
const FUNNEL_MAPPING = [
  { funnel: 'Teste', sdr: 'Jaque', type: 'sdr' },
  { funnel: 'MPM', sdr: 'Jaque', type: 'sdr' },
  { funnel: 'Mentoria Julia', sdr: 'Clara', type: 'social_selling' },
  { funnel: 'Mentoria julia', sdr: 'Clara', type: 'social_selling' },
  { funnel: 'Mentoria júlia', sdr: 'Clara', type: 'social_selling' },
  { funnel: 'Implementação Dienifer', sdr: 'Dienifer', type: 'sdr' },
  { funnel: 'Implementacao Dienifer', sdr: 'Dienifer', type: 'sdr' },
  { funnel: 'Implementação Carlos', sdr: 'Carlos', type: 'sdr' },
  { funnel: 'Implementacao Carlos', sdr: 'Carlos', type: 'sdr' },
  { funnel: '50 Scripts', sdr: 'Nathali', type: 'sdr' },
  { funnel: '50 Script', sdr: 'Nathali', type: 'sdr' },
  { funnel: 'SS Julia', sdr: 'Clara', type: 'social_selling' },
  { funnel: 'SS Júlia', sdr: 'Clara', type: 'social_selling' },
  { funnel: 'SS Cleiton', sdr: 'Thalita', type: 'social_selling' },
  { funnel: 'Orgânico Cleiton', sdr: 'Nathali', type: 'sdr' },
  { funnel: 'Organico Cleiton', sdr: 'Nathali', type: 'sdr' },
];

// Offsets de colunas por tipo de funil (relativo à coluna do título)
// SDR normal: Ativados(0), Agendado(1), %Agend(2), AgendDia(3), Realizado(4), %Comp(5), Vendas(6), %Conv(7)
// Social Selling: Ativados(0), Respostas(1), Agendado(2), %Agend(3), AgendDia(4), Realizado(5), %Comp(6), Vendas(7), %Conv(8)
const COLUMN_OFFSETS = {
  sdr: {
    activated: 0,
    scheduled: 1,
    scheduled_same_day: 3,
    attended: 4,
    sales: 6,
  },
  social_selling: {
    activated: 0,
    scheduled: 2,      // +1 devido à coluna "Respostas"
    scheduled_same_day: 4,
    attended: 5,
    sales: 7,
  },
};

const SHEET_NAME = 'Indicadores Funis';

interface FunnelBlock {
  funnel: string;
  sdr: string;
  type: string;
  startCol: number;
  dataCol: number;  // Coluna onde está "Data" para este bloco
}

interface RawMetric {
  sdr: string;
  type: string;
  date: string;
  activated: number;
  scheduled: number;
  scheduled_same_day: number;
  attended: number;
  sales: number;
}

interface AggregatedMetric {
  activated: number;
  scheduled: number;
  scheduled_same_day: number;
  attended: number;
  sales: number;
  scheduled_rate: number;
  attendance_rate: number;
  conversion_rate: number;
}

// Parse percentage values like "25,31%" or "25.31%"
function parsePercentage(value: string): number {
  if (!value || value.includes('#DIV') || value.includes('#REF') || value.includes('#N/A')) {
    return 0;
  }
  const cleaned = value.replace('%', '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parse numeric values - garantir inteiros para evitar erros de tipo no banco
function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') {
    if (value.includes('#DIV') || value.includes('#REF') || value.includes('#N/A')) {
      return 0;
    }
    // Remover % se existir e limpar formato
    const cleaned = value.replace('%', '').replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num);
  }
  return 0;
}

// Parse date from "DD/MM" or "DD/MM/YYYY" format
function parseDate(value: string): string | null {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'total' || trimmed === '' || trimmed === 'data') return null;
  
  // Try DD/MM/YYYY
  const fullMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fullMatch) {
    return `${fullMatch[3]}-${fullMatch[2].padStart(2, '0')}-${fullMatch[1].padStart(2, '0')}`;
  }
  
  // Try DD/MM (assume current year)
  const shortMatch = value.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const year = new Date().getFullYear();
    return `${year}-${shortMatch[2].padStart(2, '0')}-${shortMatch[1].padStart(2, '0')}`;
  }
  
  return null;
}

// Find funnel blocks by scanning the title row and header row
// IMPORTANTE: Todos os funis compartilham a MESMA coluna de Data (coluna do primeiro bloco)
function findFunnelBlocks(titleRow: string[], headerRow: string[]): { blocks: FunnelBlock[], sharedDataCol: number } {
  const blocks: FunnelBlock[] = [];
  
  // Encontrar a coluna "Data" compartilhada (deve estar nas primeiras colunas)
  let sharedDataCol = 0;
  for (let col = 0; col < Math.min(headerRow.length, 10); col++) {
    const headerValue = headerRow[col]?.toString().trim().toLowerCase();
    if (headerValue === 'data') {
      sharedDataCol = col;
      console.log(`Shared Data column found at column ${col}`);
      break;
    }
  }
  
  for (let col = 0; col < titleRow.length; col++) {
    const title = titleRow[col]?.toString().trim();
    if (!title || title === '') continue;
    
    // Find matching funnel in mapping (case-insensitive)
    const mapping = FUNNEL_MAPPING.find(m => 
      m.funnel.toLowerCase() === title.toLowerCase()
    );
    
    if (mapping) {
      blocks.push({
        funnel: title,
        sdr: mapping.sdr,
        type: mapping.type,
        startCol: col,
        dataCol: sharedDataCol, // Todos usam a mesma coluna de Data
      });
      console.log(`Found funnel "${title}" at col ${col} -> SDR: ${mapping.sdr}`);
    } else {
      console.log(`Unknown funnel title at column ${col}: "${title}"`);
    }
  }
  
  return { blocks, sharedDataCol };
}

// Aggregate metrics by SDR and date
function aggregateBySDR(rawMetrics: RawMetric[]): Map<string, { type: string; dates: Map<string, AggregatedMetric> }> {
  const aggregated = new Map<string, { type: string; dates: Map<string, AggregatedMetric> }>();
  
  for (const metric of rawMetrics) {
    if (!aggregated.has(metric.sdr)) {
      aggregated.set(metric.sdr, { type: metric.type, dates: new Map() });
    }
    
    const sdrData = aggregated.get(metric.sdr)!;
    const existing = sdrData.dates.get(metric.date) || {
      activated: 0,
      scheduled: 0,
      scheduled_same_day: 0,
      attended: 0,
      sales: 0,
      scheduled_rate: 0,
      attendance_rate: 0,
      conversion_rate: 0,
    };
    
    // Sum absolute values
    existing.activated += metric.activated;
    existing.scheduled += metric.scheduled;
    existing.scheduled_same_day += metric.scheduled_same_day;
    existing.attended += metric.attended;
    existing.sales += metric.sales;
    
    sdrData.dates.set(metric.date, existing);
  }
  
  // Recalculate percentages based on totals
  for (const [, sdrData] of aggregated) {
    for (const [, metrics] of sdrData.dates) {
      metrics.scheduled_rate = metrics.activated > 0 
        ? (metrics.scheduled / metrics.activated) * 100 : 0;
      metrics.attendance_rate = metrics.scheduled > 0 
        ? (metrics.attended / metrics.scheduled) * 100 : 0;
      metrics.conversion_rate = metrics.attended > 0 
        ? (metrics.sales / metrics.attended) * 100 : 0;
    }
  }
  
  return aggregated;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get SDR sheets config
    const { data: config, error: configError } = await supabase
      .from('sdr_sheets_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching config:', configError);
      throw new Error('Failed to fetch configuration');
    }

    if (!config) {
      throw new Error('No SDR sheets configuration found. Please connect a spreadsheet first.');
    }

    const spreadsheetId = config.spreadsheet_id;
    console.log(`Syncing SDR data from spreadsheet: ${spreadsheetId}`);
    console.log(`Reading from sheet: ${SHEET_NAME}`);

    // Fetch data from the specific sheet "Indicadores Funis"
    const range = `'${SHEET_NAME}'!A1:ZZ1000`; // Wide range to capture all funnel blocks
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${googleApiKey}`;
    
    console.log(`Fetching data from: ${dataUrl.replace(googleApiKey, 'HIDDEN')}`);
    
    const dataResponse = await fetch(dataUrl);

    if (!dataResponse.ok) {
      const errorText = await dataResponse.text();
      console.error('Google Sheets API error:', errorText);
      throw new Error(`Failed to fetch spreadsheet data: ${dataResponse.status}`);
    }

    const sheetData = await dataResponse.json();
    const rows = sheetData.values || [];

    if (rows.length < 4) {
      throw new Error('Sheet has insufficient data rows');
    }

    console.log(`Fetched ${rows.length} rows from sheet`);

    // Row 2 (index 1) contains funnel titles
    const titleRow = rows[1] || [];
    console.log(`Title row (row 2): ${titleRow.slice(0, 30).join(' | ')}...`);

    // Row 3 (index 2) contains headers
    const headerRow = rows[2] || [];
    console.log(`Header row (row 3): ${headerRow.slice(0, 30).join(' | ')}...`);

    // Find funnel blocks using both title and header rows
    const { blocks: funnelBlocks, sharedDataCol } = findFunnelBlocks(titleRow, headerRow);
    console.log(`Found ${funnelBlocks.length} funnel blocks, using shared Data column at ${sharedDataCol}`);

    if (funnelBlocks.length === 0) {
      throw new Error('No matching funnel blocks found in the sheet. Check funnel names in row 2.');
    }

    // Process data rows (starting from row 4, index 3)
    const rawMetrics: RawMetric[] = [];
    
    // Usar apenas o primeiro bloco para detectar padrões de linha
    const firstBlock = funnelBlocks[0];
    let rowsProcessed = 0;
    let rowsSkipped = 0;
    let emptyRows = 0;
    let totalRows = 0;
    let headerRowsFound = 0;
    
    console.log(`\n=== Starting row processing from row 4 (index 3) to row ${rows.length} ===`);
    
    for (let rowIndex = 3; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      totalRows++;
      
      // Log para linhas vazias
      if (!row || row.length === 0) {
        emptyRows++;
        continue;
      }
      
      // Ler a data da coluna compartilhada UMA VEZ por linha
      const dateValue = row[sharedDataCol]?.toString().trim() || '';
      
      // Verificar se é uma linha de header repetida (contém "Data")
      if (dateValue.toLowerCase() === 'data') {
        headerRowsFound++;
        console.log(`Row ${rowIndex + 1}: HEADER ROW FOUND (${headerRowsFound}x) - new vertical block`);
        continue;
      }
      
      const parsedDate = parseDate(dateValue);
      
      // Log para primeiras linhas de debug
      if (rowIndex < 8) {
        const status = parsedDate ? 'valid' : (dateValue === '' ? 'empty' : `skip:${dateValue}`);
        console.log(`Row ${rowIndex + 1}: Date="${dateValue}" -> ${status}`);
      }
      
      // Se não tem data válida, pular toda a linha
      if (!parsedDate) {
        if (dateValue && dateValue.toLowerCase() !== 'total') {
          rowsSkipped++;
        }
        continue;
      }
      
      // Processar TODOS os blocos com a mesma data
      for (const block of funnelBlocks) {
        const titleCol = block.startCol;
        
        // Usar offsets corretos baseado no tipo do funil
        const offsets = COLUMN_OFFSETS[block.type as keyof typeof COLUMN_OFFSETS] || COLUMN_OFFSETS.sdr;

        const metric: RawMetric = {
          sdr: block.sdr,
          type: block.type,
          date: parsedDate,
          activated: parseNumber(row[titleCol + offsets.activated]),
          scheduled: parseNumber(row[titleCol + offsets.scheduled]),
          scheduled_same_day: parseNumber(row[titleCol + offsets.scheduled_same_day]),
          attended: parseNumber(row[titleCol + offsets.attended]),
          sales: parseNumber(row[titleCol + offsets.sales]),
        };

        rawMetrics.push(metric);
      }
      
      rowsProcessed++;
    }

    console.log(`\n=== ROW PROCESSING SUMMARY ===`);
    console.log(`Total rows scanned: ${totalRows}`);
    console.log(`Empty rows: ${emptyRows}`);
    console.log(`Header rows (vertical blocks): ${headerRowsFound + 1}`); // +1 for initial header
    console.log(`Data rows processed: ${rowsProcessed}`);
    console.log(`Rows skipped (invalid date): ${rowsSkipped}`);
    console.log(`Raw metrics extracted: ${rawMetrics.length}`);

    // Aggregate by SDR
    const aggregatedData = aggregateBySDR(rawMetrics);
    console.log(`Aggregated data for ${aggregatedData.size} SDRs`);

    let totalMetricsImported = 0;
    let sdrsProcessed = 0;
    const errors: string[] = [];

    // Process each SDR
    for (const [sdrName, sdrData] of aggregatedData) {
      console.log(`Processing SDR: ${sdrName} (${sdrData.type})`);
      
      try {
        // Get or create SDR
        const { data: existingSdr } = await supabase
          .from('sdrs')
          .select('id')
          .ilike('name', sdrName)
          .limit(1)
          .maybeSingle();

        let sdrId: string;

        if (existingSdr) {
          sdrId = existingSdr.id;
          console.log(`Found existing SDR: ${sdrId}`);
        } else {
          const { data: newSdr, error: createError } = await supabase
            .from('sdrs')
            .insert({
              name: sdrName,
              type: sdrData.type,
            })
            .select('id')
            .single();

          if (createError) {
            console.error(`Error creating SDR ${sdrName}:`, createError);
            errors.push(`Failed to create SDR: ${sdrName}`);
            continue;
          }

          sdrId = newSdr.id;
          console.log(`Created new SDR: ${sdrName} -> ${sdrId}`);
        }

        // Prepare metrics for upsert
        const metricsToUpsert = Array.from(sdrData.dates.entries()).map(([date, metrics]) => ({
          sdr_id: sdrId,
          date,
          activated: metrics.activated,
          scheduled: metrics.scheduled,
          scheduled_rate: metrics.scheduled_rate,
          scheduled_same_day: metrics.scheduled_same_day,
          attended: metrics.attended,
          attendance_rate: metrics.attendance_rate,
          sales: metrics.sales,
          conversion_rate: metrics.conversion_rate,
          source: 'google_sheets',
        }));

        console.log(`Upserting ${metricsToUpsert.length} metrics for ${sdrName}`);

        const { error: upsertError } = await supabase
          .from('sdr_metrics')
          .upsert(metricsToUpsert, {
            onConflict: 'sdr_id,date',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`Error upserting metrics for ${sdrName}:`, upsertError);
          errors.push(`Failed to save metrics for: ${sdrName}`);
        } else {
          totalMetricsImported += metricsToUpsert.length;
          sdrsProcessed++;
        }
      } catch (sdrError) {
        console.error(`Error processing SDR ${sdrName}:`, sdrError);
        errors.push(`Error processing: ${sdrName}`);
      }
    }

    // Update sync status
    const syncMessage = errors.length > 0
      ? `${sdrsProcessed} SDRs processados, ${totalMetricsImported} métricas importadas. Erros: ${errors.join('; ')}`
      : `${sdrsProcessed} SDRs processados, ${totalMetricsImported} métricas importadas com sucesso.`;

    await supabase
      .from('sdr_sheets_config')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: errors.length > 0 ? 'partial' : 'success',
        sync_message: syncMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id);

    console.log(`Sync completed: ${syncMessage}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: syncMessage,
        sdrsProcessed,
        metricsImported: totalMetricsImported,
        funnelsFound: funnelBlocks.map(b => b.funnel),
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Sync error:', error);

    // Update config with error status
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('sdr_sheets_config')
        .update({
          sync_status: 'error',
          sync_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (updateError) {
      console.error('Error updating sync status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
