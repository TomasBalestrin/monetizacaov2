import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-source',
};

// Mapeamento de funis para SDRs
const FUNNEL_MAPPING = [
  { funnel: 'Teste', sdr: 'Jaque', type: 'sdr' },
  { funnel: 'MPM', sdr: 'Jaque', type: 'sdr' },
  { funnel: 'Mentoria Julia', sdr: 'Clara', type: 'mentoria' },
  { funnel: 'Mentoria julia', sdr: 'Clara', type: 'mentoria' },
  { funnel: 'Mentoria júlia', sdr: 'Clara', type: 'mentoria' },
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

const COLUMN_OFFSETS: Record<string, { activated: number | null; scheduled: number; scheduled_same_day: number | null; attended: number; sales: number }> = {
  sdr: {
    activated: 0,
    scheduled: 1,
    scheduled_same_day: 3,
    attended: 4,
    sales: 6,
  },
  social_selling: {
    activated: 0,
    scheduled: 2,
    scheduled_same_day: 4,
    attended: 5,
    sales: 7,
  },
  mentoria: {
    activated: null,       // Não existe na planilha
    scheduled: 0,          // Coluna inicial (Agendado)
    scheduled_same_day: null, // Não existe
    attended: 1,           // +1 (Realizado)
    sales: 3,              // +3 (Vendas, pula % Comp)
  },
};

const SHEET_NAME = 'Indicadores Funis';

interface FunnelBlock {
  funnel: string;
  sdr: string;
  type: string;
  startCol: number;
  dataCol: number;
}

interface RawMetric {
  sdr: string;
  type: string;
  funnel: string;
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

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') {
    if (value.includes('#DIV') || value.includes('#REF') || value.includes('#N/A')) {
      return 0;
    }
    const cleaned = value.replace('%', '').replace(',', '.').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num);
  }
  return 0;
}

function parseDate(value: string): string | null {
  if (!value || typeof value !== 'string') return null;
  
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'total' || trimmed === '' || trimmed === 'data') return null;
  
  const fullMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fullMatch) {
    return `${fullMatch[3]}-${fullMatch[2].padStart(2, '0')}-${fullMatch[1].padStart(2, '0')}`;
  }
  
  const shortMatch = value.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const year = new Date().getFullYear();
    return `${year}-${shortMatch[2].padStart(2, '0')}-${shortMatch[1].padStart(2, '0')}`;
  }
  
  return null;
}

function findFunnelBlocks(titleRow: string[], headerRow: string[]): { blocks: FunnelBlock[], sharedDataCol: number } {
  const blocks: FunnelBlock[] = [];
  
  let sharedDataCol = 0;
  for (let col = 0; col < Math.min(headerRow.length, 10); col++) {
    const headerValue = headerRow[col]?.toString().trim().toLowerCase();
    if (headerValue === 'data') {
      sharedDataCol = col;
      break;
    }
  }
  
  for (let col = 0; col < titleRow.length; col++) {
    const title = titleRow[col]?.toString().trim();
    if (!title || title === '') continue;
    
    const mapping = FUNNEL_MAPPING.find(m => 
      m.funnel.toLowerCase() === title.toLowerCase()
    );
    
    if (mapping) {
      blocks.push({
        funnel: title,
        sdr: mapping.sdr,
        type: mapping.type,
        startCol: col,
        dataCol: sharedDataCol,
      });
    }
  }
  
  return { blocks, sharedDataCol };
}

interface FunnelMetricData {
  type: string;
  funnels: Map<string, Map<string, AggregatedMetric>>;
}

function groupBySDRAndFunnel(rawMetrics: RawMetric[]): Map<string, FunnelMetricData> {
  const grouped = new Map<string, FunnelMetricData>();
  
  for (const metric of rawMetrics) {
    if (!grouped.has(metric.sdr)) {
      grouped.set(metric.sdr, { type: metric.type, funnels: new Map() });
    }
    
    const sdrData = grouped.get(metric.sdr)!;
    
    if (!sdrData.funnels.has(metric.funnel)) {
      sdrData.funnels.set(metric.funnel, new Map());
    }
    
    const funnelDates = sdrData.funnels.get(metric.funnel)!;
    const existing = funnelDates.get(metric.date) || {
      activated: 0,
      scheduled: 0,
      scheduled_same_day: 0,
      attended: 0,
      sales: 0,
      scheduled_rate: 0,
      attendance_rate: 0,
      conversion_rate: 0,
    };
    
    existing.activated += metric.activated;
    existing.scheduled += metric.scheduled;
    existing.scheduled_same_day += metric.scheduled_same_day;
    existing.attended += metric.attended;
    existing.sales += metric.sales;
    
    funnelDates.set(metric.date, existing);
  }
  
  for (const [, sdrData] of grouped) {
    for (const [, dates] of sdrData.funnels) {
      for (const [, metrics] of dates) {
        metrics.scheduled_rate = metrics.activated > 0 
          ? (metrics.scheduled / metrics.activated) * 100 : 0;
        metrics.attendance_rate = metrics.scheduled > 0 
          ? (metrics.attended / metrics.scheduled) * 100 : 0;
        metrics.conversion_rate = metrics.attended > 0 
          ? (metrics.sales / metrics.attended) * 100 : 0;
      }
    }
  }
  
  return grouped;
}

Deno.serve(async (req) => {
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

    // Check if this is a cron-triggered call
    const cronSource = req.headers.get('X-Cron-Source');
    const isCronCall = cronSource === 'pg_cron';

    console.log(`SDR Sync triggered - Cron: ${isCronCall}`);

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
      console.log('No SDR sheets config found - skipping sync');
      return new Response(
        JSON.stringify({ message: 'No spreadsheet configured', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const spreadsheetId = config.spreadsheet_id;
    console.log(`Syncing SDR data from spreadsheet: ${spreadsheetId}`);

    const range = `'${SHEET_NAME}'!A1:ZZ1000`;
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${googleApiKey}`;
    
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

    const titleRow = rows[1] || [];
    const headerRow = rows[2] || [];

    const { blocks: funnelBlocks, sharedDataCol } = findFunnelBlocks(titleRow, headerRow);
    console.log(`Found ${funnelBlocks.length} funnel blocks`);

    if (funnelBlocks.length === 0) {
      throw new Error('No matching funnel blocks found in the sheet');
    }

    const rawMetrics: RawMetric[] = [];
    
    for (let rowIndex = 3; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      
      if (!row || row.length === 0) continue;
      
      const dateValue = row[sharedDataCol]?.toString().trim() || '';
      
      if (dateValue.toLowerCase() === 'data') continue;
      
      const parsedDate = parseDate(dateValue);
      
      if (!parsedDate) continue;
      
      // Skip future dates to avoid zero-value records
      const today = new Date().toISOString().split('T')[0];
      if (parsedDate > today) {
        continue;
      }
      
      for (const block of funnelBlocks) {
        const titleCol = block.startCol;
        const offsets = COLUMN_OFFSETS[block.type] || COLUMN_OFFSETS.sdr;

        const metric: RawMetric = {
          sdr: block.sdr,
          type: block.type,
          funnel: block.funnel,
          date: parsedDate,
          activated: offsets.activated !== null 
            ? parseNumber(row[titleCol + offsets.activated]) 
            : 0,
          scheduled: parseNumber(row[titleCol + offsets.scheduled]),
          scheduled_same_day: offsets.scheduled_same_day !== null 
            ? parseNumber(row[titleCol + offsets.scheduled_same_day]) 
            : 0,
          attended: parseNumber(row[titleCol + offsets.attended]),
          sales: parseNumber(row[titleCol + offsets.sales]),
        };

        rawMetrics.push(metric);
      }
    }

    console.log(`Raw metrics extracted: ${rawMetrics.length}`);

    const groupedData = groupBySDRAndFunnel(rawMetrics);
    console.log(`Grouped data for ${groupedData.size} SDRs`);

    let totalMetricsImported = 0;
    let sdrsProcessed = 0;
    const errors: string[] = [];

    for (const [sdrName, sdrData] of groupedData) {
      try {
        const { data: existingSdr } = await supabase
          .from('sdrs')
          .select('id')
          .ilike('name', sdrName)
          .limit(1)
          .maybeSingle();

        let sdrId: string;

        if (existingSdr) {
          sdrId = existingSdr.id;
        } else {
          const { data: newSdr, error: createError } = await supabase
            .from('sdrs')
            .insert({ name: sdrName, type: sdrData.type })
            .select('id')
            .single();

          if (createError) {
            errors.push(`Failed to create SDR: ${sdrName}`);
            continue;
          }

          sdrId = newSdr.id;
        }

        for (const [funnelName, dateMetrics] of sdrData.funnels) {
          const metricsToUpsert = Array.from(dateMetrics.entries()).map(([date, metrics]) => ({
            sdr_id: sdrId,
            date,
            funnel: funnelName,
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

          const { error: upsertError } = await supabase
            .from('sdr_metrics')
            .upsert(metricsToUpsert, {
              onConflict: 'sdr_id,date,funnel',
              ignoreDuplicates: false,
            });

          if (upsertError) {
            errors.push(`Failed to save metrics for: ${sdrName} - ${funnelName}`);
          } else {
            totalMetricsImported += metricsToUpsert.length;
          }
        }
        
        sdrsProcessed++;
      } catch (sdrError) {
        errors.push(`Error processing: ${sdrName}`);
      }
    }

    const syncMessage = errors.length > 0
      ? `${sdrsProcessed} SDRs, ${totalMetricsImported} métricas. Erros: ${errors.length}. ${isCronCall ? '(Auto)' : ''}`
      : `${sdrsProcessed} SDRs, ${totalMetricsImported} métricas. ${isCronCall ? '(Auto)' : ''}`;

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
        fromCron: isCronCall,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SDR Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
