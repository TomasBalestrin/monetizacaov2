import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de funis para SDRs
const FUNNEL_MAPPING = [
  { funnel: 'Teste', sdr: 'Jaque', type: 'sdr' },
  { funnel: 'MPM', sdr: 'Jaque', type: 'sdr' },
  { funnel: 'Mentoria júlia', sdr: 'Clara', type: 'social_selling' },
  { funnel: 'Mentoria julia', sdr: 'Clara', type: 'social_selling' },
  { funnel: 'Implementação Ia', sdr: 'Dienifer', type: 'sdr' },
  { funnel: 'Implementação IA', sdr: 'Carlos', type: 'sdr' },
  { funnel: '50 Script', sdr: 'Nathali', type: 'sdr' },
  { funnel: 'SS Júlia', sdr: 'Clara', type: 'social_selling' },
  { funnel: 'SS Julia', sdr: 'Clara', type: 'social_selling' },
  { funnel: 'SS Cleiton', sdr: 'Thalita', type: 'social_selling' },
  { funnel: 'Orgânico', sdr: 'Nathali', type: 'sdr' },
  { funnel: 'Organico', sdr: 'Nathali', type: 'sdr' },
];

const SHEET_NAME = 'Indicadores Funis';

interface FunnelBlock {
  funnel: string;
  sdr: string;
  type: string;
  startCol: number;
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

// Parse numeric values
function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (value.includes('#DIV') || value.includes('#REF') || value.includes('#N/A')) {
      return 0;
    }
    const cleaned = value.replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
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

// Find funnel blocks by scanning the title row
function findFunnelBlocks(titleRow: string[]): FunnelBlock[] {
  const blocks: FunnelBlock[] = [];
  
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
      });
      console.log(`Found funnel "${title}" at column ${col} -> SDR: ${mapping.sdr}`);
    } else {
      console.log(`Unknown funnel title at column ${col}: "${title}"`);
    }
  }
  
  return blocks;
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

    // Find funnel blocks
    const funnelBlocks = findFunnelBlocks(titleRow);
    console.log(`Found ${funnelBlocks.length} funnel blocks`);

    if (funnelBlocks.length === 0) {
      throw new Error('No matching funnel blocks found in the sheet. Check funnel names in row 2.');
    }

    // Row 3 (index 2) contains headers - verify structure
    const headerRow = rows[2] || [];
    console.log(`Header row (row 3): ${headerRow.slice(0, 20).join(' | ')}...`);

    // Process data rows (starting from row 4, index 3)
    const rawMetrics: RawMetric[] = [];
    
    for (let rowIndex = 3; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!row || row.length === 0) continue;

      for (const block of funnelBlocks) {
        const col = block.startCol;
        
        // Column offsets within each block:
        // 0: Data, 1: Ativados, 2: Agendado, 3: % Agend, 4: Agend dia, 5: Realizado, 6: % Comp, 7: Vendas, 8: % Conv
        const dateValue = row[col]?.toString().trim() || '';
        const parsedDate = parseDate(dateValue);
        
        if (!parsedDate) continue; // Skip rows without valid date (Total, empty, etc.)

        const metric: RawMetric = {
          sdr: block.sdr,
          type: block.type,
          date: parsedDate,
          activated: parseNumber(row[col + 1]),
          scheduled: parseNumber(row[col + 2]),
          // Column 3 is % Agendamento (skip - we'll recalculate)
          scheduled_same_day: parseNumber(row[col + 4]),
          attended: parseNumber(row[col + 5]),
          // Column 6 is % Comp (skip - we'll recalculate)
          sales: parseNumber(row[col + 7]),
          // Column 8 is % Conv (skip - we'll recalculate)
        };

        rawMetrics.push(metric);
      }
    }

    console.log(`Extracted ${rawMetrics.length} raw metric entries`);

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
