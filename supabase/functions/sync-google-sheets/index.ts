import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetData {
  closerName: string;
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

// Default row mapping (can be overridden by config)
const DEFAULT_ROW_MAPPING = {
  calls: 7,
  revenue: 10,
  entries: 11,
  revenueTrend: 12,
  entriesTrend: 13,
  sales: 14,
  cancellations: 15,
  cancellationValue: 16,
  cancellationEntries: 17,
};

interface RowMapping {
  calls: number;
  revenue: number;
  entries: number;
  revenueTrend: number;
  entriesTrend: number;
  sales: number;
  cancellations: number;
  cancellationValue: number;
  cancellationEntries: number;
}

// Extract spreadsheet ID from URL or return as-is if already an ID
function extractSpreadsheetId(input: string): string {
  // If it looks like a URL, extract the ID
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  // If it contains /d/ pattern but didn't match, try a broader pattern
  if (input.includes('docs.google.com')) {
    const parts = input.split('/d/');
    if (parts[1]) {
      return parts[1].split('/')[0].split('?')[0].split('#')[0];
    }
  }
  // Return as-is (assume it's already an ID)
  return input.trim();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY não configurada');
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('User authenticated:', userId);

    // Check if user is admin or manager
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError || !roleData) {
      console.error('Error fetching role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Permissão negada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (roleData.role !== 'admin' && roleData.role !== 'manager') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores e gerentes podem sincronizar' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Google Sheets config
    const { data: config, error: configError } = await supabase
      .from('google_sheets_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error('Error fetching config:', configError);
      throw new Error('Erro ao buscar configuração');
    }

    if (!config || !config.spreadsheet_id) {
      throw new Error('Nenhuma planilha configurada');
    }

    // Extract the spreadsheet ID from URL if needed
    const spreadsheetId = extractSpreadsheetId(config.spreadsheet_id);
    console.log('Syncing spreadsheet ID:', spreadsheetId);

    // Get row mapping from config or use defaults
    const rowMapping: RowMapping = config.row_mapping 
      ? { ...DEFAULT_ROW_MAPPING, ...config.row_mapping }
      : DEFAULT_ROW_MAPPING;
    console.log('Using row mapping:', rowMapping);

    // Get spreadsheet metadata (list of sheets/tabs)
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${GOOGLE_API_KEY}`;
    const metadataResponse = await fetch(metadataUrl);
    
    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('Google API error:', errorText);
      
      // Update config with error status
      await supabase
        .from('google_sheets_config')
        .update({
          sync_status: 'error',
          sync_message: 'Erro ao acessar planilha. Verifique se está pública e o ID está correto.',
          last_sync_at: new Date().toISOString()
        })
        .eq('id', config.id);
      
      throw new Error('Não foi possível acessar a planilha. Verifique se está configurada como pública.');
    }

    const metadata = await metadataResponse.json();
    const sheets = metadata.sheets || [];
    const spreadsheetName = metadata.properties?.title || 'Planilha';

    console.log(`Found ${sheets.length} sheets in spreadsheet "${spreadsheetName}"`);

    // Get all squads for mapping
    const { data: squads, error: squadsError } = await supabase
      .from('squads')
      .select('id, name, slug');

    if (squadsError) {
      console.error('Error fetching squads:', squadsError);
      throw new Error('Erro ao buscar squads');
    }

    // Get all closers for mapping
    const { data: existingClosers, error: closersError } = await supabase
      .from('closers')
      .select('id, name, squad_id');

    if (closersError) {
      console.error('Error fetching closers:', closersError);
      throw new Error('Erro ao buscar closers');
    }

    const closerMap = new Map(existingClosers?.map(c => [c.name.toLowerCase().trim(), c]) || []);
    
    let recordsImported = 0;
    let closersProcessed = 0;
    const errors: string[] = [];

    // Get current date for period
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    // Process each sheet (each sheet = one closer)
    for (const sheet of sheets) {
      const sheetName = sheet.properties?.title;
      if (!sheetName) continue;

      // Skip sheets that look like instructions or templates
      if (sheetName.toLowerCase().includes('template') || 
          sheetName.toLowerCase().includes('instruc') ||
          sheetName.toLowerCase().includes('exemplo')) {
        console.log(`Skipping sheet: ${sheetName}`);
        continue;
      }

      console.log(`Processing sheet: ${sheetName}`);

      try {
        // Fetch data from this sheet (columns A and B, rows 1-20)
        const range = `'${sheetName}'!A1:B20`;
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${GOOGLE_API_KEY}`;
        const dataResponse = await fetch(dataUrl);
        
        if (!dataResponse.ok) {
          console.error(`Error fetching sheet ${sheetName}:`, await dataResponse.text());
          errors.push(`Erro ao ler aba "${sheetName}"`);
          continue;
        }

        const sheetData = await dataResponse.json();
        const values = sheetData.values || [];

        // Extract metrics from specific rows
        const getValue = (row: number): number => {
          if (row <= 0 || row > values.length) return 0;
          const rowData = values[row - 1];
          if (!rowData || rowData.length < 2) return 0;
          const value = rowData[1]; // Column B
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            // Remove currency formatting and parse
            const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
            return parseFloat(cleaned) || 0;
          }
          return 0;
        };

        const metrics: SheetData = {
          closerName: sheetName.trim(),
          calls: Math.round(getValue(rowMapping.calls)),
          sales: Math.round(getValue(rowMapping.sales)),
          revenue: getValue(rowMapping.revenue),
          entries: getValue(rowMapping.entries),
          revenueTrend: getValue(rowMapping.revenueTrend),
          entriesTrend: getValue(rowMapping.entriesTrend),
          cancellations: Math.round(getValue(rowMapping.cancellations)),
          cancellationValue: getValue(rowMapping.cancellationValue),
          cancellationEntries: getValue(rowMapping.cancellationEntries),
        };

        console.log(`Metrics for ${sheetName}:`, metrics);

        // Find or create closer
        let closer = closerMap.get(sheetName.toLowerCase().trim());
        
        if (!closer) {
          // Try to find a matching squad or use the first one
          const defaultSquad = squads?.[0];
          if (!defaultSquad) {
            errors.push(`Closer "${sheetName}" não encontrado e não há squads cadastrados`);
            continue;
          }

          // Create the closer
          const { data: newCloser, error: createError } = await supabase
            .from('closers')
            .insert({
              name: sheetName.trim(),
              squad_id: defaultSquad.id
            })
            .select()
            .single();

          if (createError) {
            console.error(`Error creating closer ${sheetName}:`, createError);
            errors.push(`Erro ao criar closer "${sheetName}"`);
            continue;
          }

          closer = newCloser;
          closerMap.set(sheetName.toLowerCase().trim(), newCloser);
          console.log(`Created new closer: ${sheetName}`);
        }

        if (!closer) {
          errors.push(`Não foi possível encontrar ou criar closer "${sheetName}"`);
          continue;
        }

        // Upsert metrics
        const { error: metricsError } = await supabase
          .from('metrics')
          .upsert({
            closer_id: closer.id,
            period_start: periodStart,
            period_end: periodEnd,
            calls: metrics.calls,
            sales: metrics.sales,
            revenue: metrics.revenue,
            entries: metrics.entries,
            revenue_trend: metrics.revenueTrend,
            entries_trend: metrics.entriesTrend,
            cancellations: metrics.cancellations,
            cancellation_value: metrics.cancellationValue,
            cancellation_entries: metrics.cancellationEntries,
            source: 'google_sheets',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'closer_id,period_start,period_end'
          });

        if (metricsError) {
          console.error(`Error upserting metrics for ${sheetName}:`, metricsError);
          errors.push(`Erro ao salvar métricas de "${sheetName}"`);
          continue;
        }

        recordsImported++;
        closersProcessed++;
        console.log(`Successfully imported metrics for ${sheetName}`);

      } catch (sheetError) {
        console.error(`Error processing sheet ${sheetName}:`, sheetError);
        errors.push(`Erro ao processar aba "${sheetName}"`);
      }
    }

    // Update config with sync status
    const syncStatus = errors.length === 0 ? 'success' : (recordsImported > 0 ? 'partial' : 'error');
    const syncMessage = errors.length > 0 
      ? `${recordsImported} registros importados. Erros: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`
      : `${recordsImported} registros importados com sucesso`;

    await supabase
      .from('google_sheets_config')
      .update({
        spreadsheet_name: spreadsheetName,
        sync_status: syncStatus,
        sync_message: syncMessage,
        last_sync_at: new Date().toISOString()
      })
      .eq('id', config.id);

    console.log('Sync completed:', { recordsImported, closersProcessed, errors: errors.length });

    return new Response(
      JSON.stringify({
        success: true,
        recordsImported,
        closersProcessed,
        spreadsheetName,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
