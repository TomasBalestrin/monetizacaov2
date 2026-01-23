import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-source',
};

interface MetricOffsets {
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
  revenueTrend: number;
  entriesTrend: number;
  cancellations: number;
  cancellationValue: number;
  cancellationEntries: number;
}

interface WeekBlockConfig {
  firstBlockStartRow: number;
  blockOffset: number;
  numberOfBlocks: number;
  dateRow: number;
  column: string;
  metrics: MetricOffsets;
}

interface SheetData {
  closerName: string;
  weekNumber: number;
  periodStart: string;
  periodEnd: string;
  calls: number;
  sales: number;
  revenue: number;
  entries: number;
  revenueTrend: number;
  entriesTrend: number;
  cancellations: number;
  cancellationValue: number;
  cancellationEntries: number;
}

const DEFAULT_CONFIG: WeekBlockConfig = {
  firstBlockStartRow: 5,
  blockOffset: 13,
  numberOfBlocks: 4,
  dateRow: 1,
  column: 'G',
  metrics: {
    calls: 0,
    sales: 1,
    revenue: 3,
    entries: 4,
    revenueTrend: 5,
    entriesTrend: 6,
    cancellations: 7,
    cancellationValue: 9,
    cancellationEntries: 10
  }
};

function extractSpreadsheetId(input: string): string {
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  return input.trim();
}

function normalizeConfig(rawConfig: unknown): WeekBlockConfig {
  console.log('Raw config from DB:', JSON.stringify(rawConfig));
  
  if (!rawConfig || typeof rawConfig !== 'object') {
    console.log('No config found, using defaults');
    return { ...DEFAULT_CONFIG };
  }
  
  const config = rawConfig as Record<string, unknown>;
  
  // New format: has 'metrics' nested object
  if ('metrics' in config && typeof config.metrics === 'object') {
    const metricsObj = config.metrics as Record<string, number>;
    
    // Check if the metrics have invalid values (offsets > 10 indicate absolute rows, not relative offsets)
    const hasInvalidOffsets = Object.values(metricsObj).some(v => typeof v === 'number' && v > 10);
    
    if (hasInvalidOffsets) {
      console.log('Detected invalid metric offsets (>10), using DEFAULT metrics. Preserving block config.');
      return {
        ...DEFAULT_CONFIG,
        firstBlockStartRow: (config.firstBlockStartRow as number) || DEFAULT_CONFIG.firstBlockStartRow,
        blockOffset: (config.blockOffset as number) || DEFAULT_CONFIG.blockOffset,
        numberOfBlocks: (config.numberOfBlocks as number) || DEFAULT_CONFIG.numberOfBlocks,
        dateRow: (config.dateRow as number) ?? DEFAULT_CONFIG.dateRow,
        column: (config.column as string) || DEFAULT_CONFIG.column,
        metrics: { ...DEFAULT_CONFIG.metrics },
      };
    }
    
    console.log('Using new structured config format');
    return {
      ...DEFAULT_CONFIG,
      firstBlockStartRow: (config.firstBlockStartRow as number) || DEFAULT_CONFIG.firstBlockStartRow,
      blockOffset: (config.blockOffset as number) || DEFAULT_CONFIG.blockOffset,
      numberOfBlocks: (config.numberOfBlocks as number) || DEFAULT_CONFIG.numberOfBlocks,
      dateRow: (config.dateRow as number) ?? DEFAULT_CONFIG.dateRow,
      column: (config.column as string) || DEFAULT_CONFIG.column,
      metrics: {
        ...DEFAULT_CONFIG.metrics,
        ...metricsObj,
      }
    };
  }
  
  // Legacy format: flat object with metric offsets directly (e.g., { calls: 7, sales: 14 })
  // Check if it has numeric values that look like metric offsets
  const hasLegacyMetrics = 'calls' in config || 'sales' in config || 'revenue' in config;
  
  if (hasLegacyMetrics) {
    // Check if legacy values are invalid (absolute rows instead of relative offsets)
    const legacyValues = [
      config.calls as number,
      config.sales as number,
      config.revenue as number,
    ].filter(v => typeof v === 'number');
    
    const hasInvalidLegacyOffsets = legacyValues.some(v => v > 10);
    
    if (hasInvalidLegacyOffsets) {
      console.log('Detected invalid legacy config with absolute row values (>10), using DEFAULTS');
      return {
        ...DEFAULT_CONFIG,
        column: (config.column as string) || DEFAULT_CONFIG.column,
      };
    }
    
    console.log('Detected legacy flat config format, converting to new format');
    return {
      ...DEFAULT_CONFIG,
      column: (config.column as string) || DEFAULT_CONFIG.column,
      metrics: {
        calls: (config.calls as number) ?? DEFAULT_CONFIG.metrics.calls,
        sales: (config.sales as number) ?? DEFAULT_CONFIG.metrics.sales,
        revenue: (config.revenue as number) ?? DEFAULT_CONFIG.metrics.revenue,
        entries: (config.entries as number) ?? DEFAULT_CONFIG.metrics.entries,
        revenueTrend: (config.revenueTrend as number) ?? DEFAULT_CONFIG.metrics.revenueTrend,
        entriesTrend: (config.entriesTrend as number) ?? DEFAULT_CONFIG.metrics.entriesTrend,
        cancellations: (config.cancellations as number) ?? DEFAULT_CONFIG.metrics.cancellations,
        cancellationValue: (config.cancellationValue as number) ?? DEFAULT_CONFIG.metrics.cancellationValue,
        cancellationEntries: (config.cancellationEntries as number) ?? DEFAULT_CONFIG.metrics.cancellationEntries,
      }
    };
  }
  
  // Fallback: just use column if present
  console.log('Using defaults with column override');
  return {
    ...DEFAULT_CONFIG,
    column: (config.column as string) || DEFAULT_CONFIG.column,
  };
}

function parseNumericValue(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  const strValue = String(value)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace('%', '')
    .trim();
  
  const num = parseFloat(strValue);
  return isNaN(num) ? 0 : num;
}

function extractDateFromRow(rowData: unknown[], columnIndex: number): { start: string; end: string } | null {
  try {
    const cellValue = rowData[columnIndex];
    if (!cellValue) return null;
    
    const dateStr = String(cellValue);
    const rangeMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*[-–]\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    
    if (rangeMatch) {
      const currentYear = new Date().getFullYear();
      const startDay = rangeMatch[1].padStart(2, '0');
      const startMonth = rangeMatch[2].padStart(2, '0');
      const startYear = rangeMatch[3] ? (rangeMatch[3].length === 2 ? `20${rangeMatch[3]}` : rangeMatch[3]) : String(currentYear);
      
      const endDay = rangeMatch[4].padStart(2, '0');
      const endMonth = rangeMatch[5].padStart(2, '0');
      const endYear = rangeMatch[6] ? (rangeMatch[6].length === 2 ? `20${rangeMatch[6]}` : rangeMatch[6]) : String(currentYear);
      
      return {
        start: `${startYear}-${startMonth}-${startDay}`,
        end: `${endYear}-${endMonth}-${endDay}`,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting date:', error);
    return null;
  }
}

function calculateWeekDates(weekNumber: number): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const startDay = 1 + ((weekNumber - 1) * 7);
  const endDay = Math.min(startDay + 4, new Date(year, month + 1, 0).getDate());
  
  const startDate = new Date(year, month, startDay);
  const endDate = new Date(year, month, endDay);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a cron-triggered call
    const cronSource = req.headers.get('X-Cron-Source');
    const isCronCall = cronSource === 'pg_cron';
    const authHeader = req.headers.get('Authorization');

    console.log(`Sync triggered - Cron: ${isCronCall}, Auth: ${authHeader ? 'present' : 'missing'}`);

    // Use service role client for all operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // For non-cron calls, validate user auth
    if (!isCronCall) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roleData || !['admin', 'manager'].includes(roleData.role)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get Google Sheets config
    const { data: configData, error: configError } = await adminClient
      .from('google_sheets_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (configError || !configData) {
      console.log('No Google Sheets config found - skipping sync');
      return new Response(
        JSON.stringify({ message: 'No spreadsheet configured', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const spreadsheetId = extractSpreadsheetId(configData.spreadsheet_id);
    const blockConfig = normalizeConfig(configData.row_mapping);

    console.log('Using block config:', JSON.stringify(blockConfig));

    // Update sync status
    await adminClient
      .from('google_sheets_config')
      .update({ sync_status: 'syncing', sync_message: 'Buscando dados...' })
      .eq('id', configData.id);

    // Fetch spreadsheet metadata
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${googleApiKey}`;
    const metadataResponse = await fetch(metadataUrl);
    
    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('Google Sheets API error:', errorText);
      await adminClient
        .from('google_sheets_config')
        .update({ sync_status: 'error', sync_message: 'Erro ao acessar planilha' })
        .eq('id', configData.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to access spreadsheet', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = await metadataResponse.json();
    const sheets = metadata.sheets || [];
    
    // Fetch existing closers from database
    const { data: existingClosers, error: closersError } = await adminClient
      .from('closers')
      .select('id, name, squad_id');
    
    if (closersError) {
      console.error('Error fetching closers:', closersError);
      await adminClient
        .from('google_sheets_config')
        .update({ sync_status: 'error', sync_message: 'Erro ao buscar closers' })
        .eq('id', configData.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch closers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Found ${existingClosers?.length || 0} closers in database:`, existingClosers?.map(c => c.name));
    
    const closerMap = new Map<string, { id: string; name: string; squad_id: string }>();
    for (const closer of existingClosers || []) {
      closerMap.set(closer.name.toLowerCase().trim(), closer);
    }
    
    const validSheets: { sheetName: string; closer: { id: string; name: string; squad_id: string } }[] = [];
    
    for (const sheet of sheets) {
      const sheetName = sheet.properties.title;
      const sheetNameLower = sheetName.toLowerCase().trim();
      
      let matchedCloser = closerMap.get(sheetNameLower);
      
      if (!matchedCloser && sheetNameLower.includes('total squad')) {
        for (const [closerNameLower, closer] of closerMap) {
          if (sheetNameLower.includes(closerNameLower)) {
            console.log(`Sheet "${sheetName}" is a single-closer squad total, mapping to "${closer.name}"`);
            matchedCloser = closer;
            break;
          }
        }
      }
      
      if (matchedCloser) {
        console.log(`Sheet "${sheetName}" matched to closer "${matchedCloser.name}"`);
        validSheets.push({ sheetName, closer: matchedCloser });
        continue;
      }
      
      if (sheetNameLower.includes('total')) continue;
      if (sheetNameLower.includes('squad')) continue;
      if (sheetNameLower.includes('sdr')) continue;
      if (sheetNameLower.includes('template') || sheetNameLower.includes('modelo')) continue;
      if (sheetNameLower.includes('dashboard') || sheetNameLower.includes('resumo')) continue;
      if (sheetNameLower.includes('ascen')) continue;
    }

    console.log(`Processing ${validSheets.length} sheets with matching closers`);

    const allMetrics: SheetData[] = [];
    const columnIndex = blockConfig.column.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    const maxRow = blockConfig.firstBlockStartRow + (blockConfig.numberOfBlocks * blockConfig.blockOffset) + 5;
    
    for (const { sheetName, closer } of validSheets) {
      const range = `'${sheetName}'!A1:G${maxRow}`;
      
      console.log(`Fetching data from: ${sheetName} (closer: ${closer.name}), range: ${range}`);
      
      const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${googleApiKey}`;
      const dataResponse = await fetch(dataUrl);
      
      if (!dataResponse.ok) {
        console.error(`Failed to fetch data from ${sheetName}`);
        continue;
      }
      
      const data = await dataResponse.json();
      const values = data.values || [];
      
      if (values.length === 0) {
        console.log(`No data in sheet: ${sheetName}`);
        continue;
      }

      for (let blockIndex = 0; blockIndex < blockConfig.numberOfBlocks; blockIndex++) {
        const blockStartRow = blockConfig.firstBlockStartRow + (blockIndex * blockConfig.blockOffset);
        const weekNumber = blockIndex + 1;
        
        const getBlockValue = (relativeRow: number): number => {
          const absoluteRow = blockStartRow + relativeRow - 1;
          if (absoluteRow < 0 || absoluteRow >= values.length) return 0;
          const rowData = values[absoluteRow];
          if (!rowData || columnIndex >= rowData.length) return 0;
          return parseNumericValue(rowData[columnIndex]);
        };
        
        const dateRowIndex = blockStartRow - 1 - 1;
        let periodDates = (dateRowIndex >= 0 && dateRowIndex < values.length)
          ? extractDateFromRow(values[dateRowIndex], columnIndex) 
          : null;
        
        if (!periodDates) {
          periodDates = calculateWeekDates(weekNumber);
        }
        
        const metrics: SheetData = {
          closerName: closer.name,
          weekNumber,
          periodStart: periodDates.start,
          periodEnd: periodDates.end,
          calls: getBlockValue(blockConfig.metrics.calls),
          sales: getBlockValue(blockConfig.metrics.sales),
          revenue: getBlockValue(blockConfig.metrics.revenue),
          entries: getBlockValue(blockConfig.metrics.entries),
          revenueTrend: getBlockValue(blockConfig.metrics.revenueTrend),
          entriesTrend: getBlockValue(blockConfig.metrics.entriesTrend),
          cancellations: getBlockValue(blockConfig.metrics.cancellations),
          cancellationValue: getBlockValue(blockConfig.metrics.cancellationValue),
          cancellationEntries: getBlockValue(blockConfig.metrics.cancellationEntries),
        };
        
        console.log(`[${closer.name}] Week ${weekNumber} (${periodDates.start} - ${periodDates.end}): calls=${metrics.calls}, sales=${metrics.sales}, revenue=${metrics.revenue}, entries=${metrics.entries}, cancellationValue=${metrics.cancellationValue}`);
        
        // Salva se QUALQUER métrica tiver valor > 0 (coleta dados parciais)
        const hasAnyValue = 
          metrics.calls > 0 ||
          metrics.sales > 0 ||
          metrics.revenue > 0 ||
          metrics.entries > 0 ||
          metrics.revenueTrend > 0 ||
          metrics.entriesTrend > 0 ||
          metrics.cancellations > 0 ||
          metrics.cancellationValue > 0 ||
          metrics.cancellationEntries > 0;
        
        if (hasAnyValue) {
          allMetrics.push({ ...metrics, closerId: closer.id } as SheetData & { closerId: string });
        } else {
          console.log(`[${closer.name}] Week ${weekNumber}: Skipped - ALL metrics are zero`);
        }
      }
    }

    console.log(`Total metrics to save: ${allMetrics.length}`);

    let savedCount = 0;
    let errorCount = 0;

    for (const metric of allMetrics) {
      const matchedCloser = closerMap.get(metric.closerName.toLowerCase().trim());
      
      if (!matchedCloser) {
        errorCount++;
        continue;
      }

      const { error: metricsError } = await adminClient
        .from('metrics')
        .upsert({
          closer_id: matchedCloser.id,
          period_start: metric.periodStart,
          period_end: metric.periodEnd,
          calls: metric.calls,
          sales: metric.sales,
          revenue: metric.revenue,
          entries: metric.entries,
          revenue_trend: metric.revenueTrend,
          entries_trend: metric.entriesTrend,
          cancellations: metric.cancellations,
          cancellation_value: metric.cancellationValue,
          cancellation_entries: metric.cancellationEntries,
          source: 'google_sheets',
        }, {
          onConflict: 'closer_id,period_start,period_end',
        });

      if (metricsError) {
        console.error('Error saving metric:', metricsError);
        errorCount++;
      } else {
        savedCount++;
      }
    }

    const syncMessage = errorCount > 0
      ? `${savedCount} métricas sincronizadas, ${errorCount} erros. ${isCronCall ? '(Auto)' : ''}`
      : `${savedCount} métricas sincronizadas com sucesso. ${isCronCall ? '(Auto)' : ''}`;

    await adminClient
      .from('google_sheets_config')
      .update({
        sync_status: errorCount > 0 ? 'partial' : 'success',
        sync_message: syncMessage,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', configData.id);

    console.log(`Sync complete: ${syncMessage}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: syncMessage,
        savedCount,
        errorCount,
        fromCron: isCronCall,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
