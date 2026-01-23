import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Default config uses column H for weekly totals
const DEFAULT_CONFIG: WeekBlockConfig = {
  firstBlockStartRow: 5,
  blockOffset: 13,
  numberOfBlocks: 4,
  dateRow: 1,
  column: 'H',
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
  console.log('[sync-squad-sheets] Raw config:', JSON.stringify(rawConfig));
  
  if (!rawConfig || typeof rawConfig !== 'object') {
    console.log('[sync-squad-sheets] No config found, using defaults with column H');
    return { ...DEFAULT_CONFIG };
  }
  
  const config = rawConfig as Record<string, unknown>;
  
  // New format: has 'metrics' nested object
  if ('metrics' in config && typeof config.metrics === 'object') {
    const metricsObj = config.metrics as Record<string, number>;
    
    console.log('[sync-squad-sheets] Using structured config format');
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
  
  // Fallback: use column if present, otherwise defaults
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
    console.error('[sync-squad-sheets] Error extracting date:', error);
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

    // Parse squad from body
    let squadSlug: string | null = null;
    try {
      const body = await req.json();
      squadSlug = body.squad || null;
    } catch {
      // No body or invalid JSON
    }

    if (!squadSlug) {
      return new Response(
        JSON.stringify({ error: 'Missing squad parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-squad-sheets] Starting sync for squad: ${squadSlug}`);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user auth
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

    // Use service role client for data operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get squad info
    const { data: squadData, error: squadError } = await adminClient
      .from('squads')
      .select('id, name, slug')
      .eq('slug', squadSlug.toLowerCase())
      .single();

    if (squadError || !squadData) {
      console.error('[sync-squad-sheets] Squad not found:', squadSlug);
      return new Response(
        JSON.stringify({ error: 'Squad not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-squad-sheets] Found squad: ${squadData.name} (${squadData.id})`);

    // Get squad-specific sheets config
    const { data: configData, error: configError } = await adminClient
      .from('squad_sheets_config')
      .select('*')
      .eq('squad_id', squadData.id)
      .maybeSingle();

    if (configError) {
      console.error('[sync-squad-sheets] Error fetching config:', configError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!configData) {
      console.log('[sync-squad-sheets] No config found for squad');
      return new Response(
        JSON.stringify({ message: 'No spreadsheet configured for this squad', skipped: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const spreadsheetId = extractSpreadsheetId(configData.spreadsheet_id);
    const blockConfig = normalizeConfig(configData.row_mapping);

    console.log(`[sync-squad-sheets] Spreadsheet: ${spreadsheetId}`);
    console.log(`[sync-squad-sheets] Config: column=${blockConfig.column}, startRow=${blockConfig.firstBlockStartRow}`);

    // Update sync status
    await adminClient
      .from('squad_sheets_config')
      .update({ sync_status: 'syncing', sync_message: 'Buscando dados...' })
      .eq('id', configData.id);

    // Fetch spreadsheet metadata
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${googleApiKey}`;
    const metadataResponse = await fetch(metadataUrl);
    
    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('[sync-squad-sheets] Google Sheets API error:', errorText);
      await adminClient
        .from('squad_sheets_config')
        .update({ sync_status: 'error', sync_message: 'Erro ao acessar planilha' })
        .eq('id', configData.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to access spreadsheet', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = await metadataResponse.json();
    const spreadsheetName = metadata.properties?.title || 'Planilha';
    const sheets = metadata.sheets || [];
    
    // Fetch closers only for this squad
    const { data: squadClosers, error: closersError } = await adminClient
      .from('closers')
      .select('id, name, squad_id')
      .eq('squad_id', squadData.id);
    
    if (closersError) {
      console.error('[sync-squad-sheets] Error fetching closers:', closersError);
      await adminClient
        .from('squad_sheets_config')
        .update({ sync_status: 'error', sync_message: 'Erro ao buscar closers' })
        .eq('id', configData.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch closers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[sync-squad-sheets] Found ${squadClosers?.length || 0} closers for ${squadData.name}:`, squadClosers?.map(c => c.name));
    
    const closerMap = new Map<string, { id: string; name: string; squad_id: string }>();
    for (const closer of squadClosers || []) {
      closerMap.set(closer.name.toLowerCase().trim(), closer);
    }
    
    const validSheets: { sheetName: string; closer: { id: string; name: string; squad_id: string } }[] = [];
    
    for (const sheet of sheets) {
      const sheetName = sheet.properties.title;
      const sheetNameLower = sheetName.toLowerCase().trim();
      
      let matchedCloser = closerMap.get(sheetNameLower);
      
      // Handle single-closer squad with "TOTAL SQUAD" naming
      if (!matchedCloser && sheetNameLower.includes('total squad')) {
        for (const [closerNameLower, closer] of closerMap) {
          if (sheetNameLower.includes(closerNameLower)) {
            console.log(`[sync-squad-sheets] Sheet "${sheetName}" is a squad total, mapping to "${closer.name}"`);
            matchedCloser = closer;
            break;
          }
        }
      }
      
      if (matchedCloser) {
        console.log(`[sync-squad-sheets] Sheet "${sheetName}" matched to closer "${matchedCloser.name}"`);
        validSheets.push({ sheetName, closer: matchedCloser });
        continue;
      }
      
      // Skip non-closer sheets
      if (sheetNameLower.includes('total')) continue;
      if (sheetNameLower.includes('squad')) continue;
      if (sheetNameLower.includes('sdr')) continue;
      if (sheetNameLower.includes('template') || sheetNameLower.includes('modelo')) continue;
      if (sheetNameLower.includes('dashboard') || sheetNameLower.includes('resumo')) continue;
    }

    console.log(`[sync-squad-sheets] Processing ${validSheets.length} sheets`);

    const allMetrics: SheetData[] = [];
    const columnIndex = blockConfig.column.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    const maxRow = blockConfig.firstBlockStartRow + (blockConfig.numberOfBlocks * blockConfig.blockOffset) + 5;
    
    for (const { sheetName, closer } of validSheets) {
      // Fetch up to column H (8 columns)
      const range = `'${sheetName}'!A1:H${maxRow}`;
      
      console.log(`[sync-squad-sheets] Fetching: ${sheetName} (${closer.name}), range: ${range}`);
      
      const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${googleApiKey}`;
      const dataResponse = await fetch(dataUrl);
      
      if (!dataResponse.ok) {
        console.error(`[sync-squad-sheets] Failed to fetch ${sheetName}`);
        continue;
      }
      
      const data = await dataResponse.json();
      const values = data.values || [];
      
      if (values.length === 0) {
        console.log(`[sync-squad-sheets] No data in sheet: ${sheetName}`);
        continue;
      }

      // Debug: Log first 20 rows of the configured column
      const debugRows = values.slice(0, 20).map((row: unknown[], idx: number) => {
        const colValue = row[columnIndex] || '';
        return `R${idx + 1}:"${colValue}"`;
      });
      console.log(`[sync-squad-sheets] [${closer.name}] Column ${blockConfig.column}:`, debugRows.join(' | '));

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
        
        console.log(`[sync-squad-sheets] ${closer.name} Week ${weekNumber}: calls=${metrics.calls}, sales=${metrics.sales}, revenue=${metrics.revenue}`);
        
        allMetrics.push(metrics);
      }
    }

    console.log(`[sync-squad-sheets] Total metrics to upsert: ${allMetrics.length}`);

    // Upsert metrics
    let successCount = 0;
    for (const metric of allMetrics) {
      const closer = squadClosers?.find(c => c.name.toLowerCase() === metric.closerName.toLowerCase());
      if (!closer) continue;

      const { error: upsertError } = await adminClient
        .from('metrics')
        .upsert({
          closer_id: closer.id,
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
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'closer_id,period_start,period_end',
        });

      if (!upsertError) {
        successCount++;
      } else {
        console.error(`[sync-squad-sheets] Upsert error for ${metric.closerName}:`, upsertError);
      }
    }

    // Update config with success
    await adminClient
      .from('squad_sheets_config')
      .update({
        spreadsheet_name: spreadsheetName,
        last_sync_at: new Date().toISOString(),
        sync_status: 'success',
        sync_message: `${successCount} registros sincronizados`,
      })
      .eq('id', configData.id);

    console.log(`[sync-squad-sheets] Sync complete: ${successCount}/${allMetrics.length} records`);

    return new Response(
      JSON.stringify({
        success: true,
        squad: squadData.name,
        spreadsheet: spreadsheetName,
        closersProcessed: validSheets.length,
        metricsUpserted: successCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-squad-sheets] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
