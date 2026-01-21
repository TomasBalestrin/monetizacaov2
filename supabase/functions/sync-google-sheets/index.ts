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

const DEFAULT_CONFIG: WeekBlockConfig = {
  firstBlockStartRow: 5,    // Indicadores começam na linha 5
  blockOffset: 13,          // 13 linhas entre cada bloco (5→18→31→44)
  numberOfBlocks: 4,        // 4 semanas por aba
  dateRow: 1,               // Data está 1 linha antes do bloco
  column: 'G',
  metrics: {
    calls: 0,               // Offset 0 - Calls Realizadas
    sales: 1,               // Offset 1 - Vendas Fechadas
    revenue: 3,             // Offset 3 - Valor Total (pula Taxa de Conversão)
    entries: 4,             // Offset 4 - Valor Entrada
    revenueTrend: 5,        // Offset 5 - Tendência Valor Total
    entriesTrend: 6,        // Offset 6 - Tendência Valor Entrada
    cancellations: 7,       // Offset 7 - Número de Cancelamento
    cancellationValue: 9,   // Offset 9 - Valor de venda Cancelamento
    cancellationEntries: 10 // Offset 10 - Valor total de entrada Can
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
  if (!rawConfig || typeof rawConfig !== 'object') {
    return { ...DEFAULT_CONFIG };
  }
  
  const config = rawConfig as Record<string, unknown>;
  
  if ('metrics' in config && typeof config.metrics === 'object') {
    return {
      ...DEFAULT_CONFIG,
      firstBlockStartRow: (config.firstBlockStartRow as number) || DEFAULT_CONFIG.firstBlockStartRow,
      blockOffset: (config.blockOffset as number) || DEFAULT_CONFIG.blockOffset,
      numberOfBlocks: (config.numberOfBlocks as number) || DEFAULT_CONFIG.numberOfBlocks,
      dateRow: (config.dateRow as number) ?? DEFAULT_CONFIG.dateRow,
      column: (config.column as string) || DEFAULT_CONFIG.column,
      metrics: {
        ...DEFAULT_CONFIG.metrics,
        ...(config.metrics as Record<string, number>),
      }
    };
  }
  
  // Legacy format
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
    
    // Try to parse date range like "05/01 - 09/01" or "05/01/2026 - 09/01/2026"
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
  
  // Calculate approximate week dates based on week number
  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = 1 + ((weekNumber - 1) * 7);
  const endDay = Math.min(startDay + 4, new Date(year, month + 1, 0).getDate()); // 5 weekdays or end of month
  
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Get Google Sheets config
    const { data: configData, error: configError } = await supabase
      .from('google_sheets_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (configError || !configData) {
      return new Response(
        JSON.stringify({ error: 'Google Sheets not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const spreadsheetId = extractSpreadsheetId(configData.spreadsheet_id);
    const blockConfig = normalizeConfig(configData.row_mapping);

    console.log('Using block config:', JSON.stringify(blockConfig));

    // Update sync status
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
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
    
    // Create a map of lowercase names to closer records for case-insensitive matching
    const closerMap = new Map<string, { id: string; name: string; squad_id: string }>();
    for (const closer of existingClosers || []) {
      closerMap.set(closer.name.toLowerCase().trim(), closer);
    }
    
    // Filter sheets to only include those matching existing closers
    // Explicitly ignore: totals, SDRs, templates, etc.
    const validSheets: { sheetName: string; closer: { id: string; name: string; squad_id: string } }[] = [];
    
    for (const sheet of sheets) {
      const sheetName = sheet.properties.title;
      const sheetNameLower = sheetName.toLowerCase().trim();
      
      // Skip tabs that are NOT individual closers
      if (sheetNameLower.includes('total')) {
        console.log(`Skipping sheet "${sheetName}" - contains "total"`);
        continue;
      }
      if (sheetNameLower.includes('squad')) {
        console.log(`Skipping sheet "${sheetName}" - contains "squad"`);
        continue;
      }
      if (sheetNameLower.includes('sdr')) {
        console.log(`Skipping sheet "${sheetName}" - contains "sdr"`);
        continue;
      }
      if (sheetNameLower.includes('template') || sheetNameLower.includes('modelo')) {
        console.log(`Skipping sheet "${sheetName}" - is a template`);
        continue;
      }
      if (sheetNameLower.includes('dashboard') || sheetNameLower.includes('resumo')) {
        console.log(`Skipping sheet "${sheetName}" - is a dashboard/summary`);
        continue;
      }
      if (sheetNameLower.includes('ascen')) {
        console.log(`Skipping sheet "${sheetName}" - is ascensão/cs`);
        continue;
      }
      
      // Try to match with existing closer (case-insensitive)
      const matchedCloser = closerMap.get(sheetNameLower);
      
      if (matchedCloser) {
        console.log(`Sheet "${sheetName}" matched to closer "${matchedCloser.name}"`);
        validSheets.push({ sheetName, closer: matchedCloser });
      } else {
        console.log(`Sheet "${sheetName}" has no matching closer in database - skipping`);
      }
    }

    console.log(`Processing ${validSheets.length} sheets with matching closers`);

    const allMetrics: SheetData[] = [];
    const columnIndex = blockConfig.column.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
    
    // Expand range to cover all blocks
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

      // Process each weekly block
      for (let blockIndex = 0; blockIndex < blockConfig.numberOfBlocks; blockIndex++) {
        const blockStartRow = blockConfig.firstBlockStartRow + (blockIndex * blockConfig.blockOffset);
        const weekNumber = blockIndex + 1;
        
        console.log(`Processing week ${weekNumber} starting at row ${blockStartRow}`);
        
        // Helper to get value from a relative position within the block
        // relativeRow is a 0-based offset from blockStartRow
        const getBlockValue = (relativeRow: number): number => {
          const absoluteRow = blockStartRow + relativeRow - 1; // Convert to 0-indexed array position
          if (absoluteRow < 0 || absoluteRow >= values.length) return 0;
          const rowData = values[absoluteRow];
          if (!rowData || columnIndex >= rowData.length) return 0;
          return parseNumericValue(rowData[columnIndex]);
        };
        
        // Date is located 1 row BEFORE the indicator block
        const dateRowIndex = blockStartRow - 1 - 1;
        let periodDates = (dateRowIndex >= 0 && dateRowIndex < values.length)
          ? extractDateFromRow(values[dateRowIndex], columnIndex) 
          : null;
        
        // If no dates found, calculate based on week number
        if (!periodDates) {
          periodDates = calculateWeekDates(weekNumber);
          console.log(`Using calculated dates for week ${weekNumber}:`, periodDates);
        }
        
        const metrics: SheetData = {
          closerName: closer.name, // Use the database closer name, not the sheet name
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
        
        // Only add if there's actual data
        if (metrics.calls > 0 || metrics.sales > 0 || metrics.revenue > 0) {
          allMetrics.push({ ...metrics, closerId: closer.id } as SheetData & { closerId: string });
          console.log(`Week ${weekNumber} data for ${closer.name}:`, metrics);
        } else {
          console.log(`Skipping week ${weekNumber} for ${closer.name} - no data`);
        }
      }
    }

    console.log(`Total metrics to save: ${allMetrics.length}`);

    // Save metrics to database - closers are already matched, no need to create
    let savedCount = 0;
    let errorCount = 0;

    for (const metric of allMetrics) {
      // Get the closer ID from our earlier matching
      const matchedCloser = closerMap.get(metric.closerName.toLowerCase().trim());
      
      if (!matchedCloser) {
        console.error(`No closer found for ${metric.closerName}`);
        errorCount++;
        continue;
      }

      // Upsert metrics
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
        console.error(`Failed to save metrics for ${metric.closerName} week ${metric.weekNumber}:`, metricsError);
        errorCount++;
      } else {
        savedCount++;
      }
    }

    // Update sync status
    const statusMessage = errorCount > 0 
      ? `Sincronizado: ${savedCount} registros (${errorCount} erros)`
      : `Sincronizado: ${savedCount} registros semanais`;

    await adminClient
      .from('google_sheets_config')
      .update({ 
        sync_status: 'success', 
        sync_message: statusMessage,
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', configData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: statusMessage,
        details: {
          sheetsProcessed: validSheets.length,
          metricsFound: allMetrics.length,
          metricsSaved: savedCount,
          errors: errorCount,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
