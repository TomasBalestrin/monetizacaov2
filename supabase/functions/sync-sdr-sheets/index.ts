import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SDRMetricRow {
  date: string;
  activated: number;
  scheduled: number;
  scheduled_rate: number;
  scheduled_same_day: number;
  attended: number;
  attendance_rate: number;
  sales: number;
  conversion_rate: number;
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
      throw new Error('No SDR sheets configuration found');
    }

    const spreadsheetId = config.spreadsheet_id;
    console.log(`Syncing SDR data from spreadsheet: ${spreadsheetId}`);

    // Get spreadsheet metadata to list all sheets
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${googleApiKey}`;
    const metadataResponse = await fetch(metadataUrl);

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('Google Sheets API error:', errorText);
      throw new Error(`Failed to fetch spreadsheet metadata: ${metadataResponse.status}`);
    }

    const metadata = await metadataResponse.json();
    const sheets = metadata.sheets || [];
    console.log(`Found ${sheets.length} sheets`);

    // Filter sheets - exclude totals, templates, etc.
    const excludePatterns = ['total', 'template', 'modelo', 'config', 'instruc'];
    const sdrSheets = sheets.filter((sheet: { properties: { title: string } }) => {
      const title = sheet.properties.title.toLowerCase();
      return !excludePatterns.some(pattern => title.includes(pattern));
    });

    console.log(`Processing ${sdrSheets.length} SDR sheets`);

    let totalMetricsImported = 0;
    let sdrsProcessed = 0;
    const errors: string[] = [];

    for (const sheet of sdrSheets) {
      const sheetTitle = sheet.properties.title;
      console.log(`Processing sheet: ${sheetTitle}`);

      try {
        // Determine SDR type based on sheet name
        const lowerTitle = sheetTitle.toLowerCase();
        const sdrType = lowerTitle.includes('social') || lowerTitle.includes('ss')
          ? 'social_selling'
          : 'sdr';

        // Get or create SDR
        const { data: existingSdr } = await supabase
          .from('sdrs')
          .select('id')
          .ilike('name', sheetTitle)
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
              name: sheetTitle,
              type: sdrType,
            })
            .select('id')
            .single();

          if (createError) {
            console.error(`Error creating SDR ${sheetTitle}:`, createError);
            errors.push(`Failed to create SDR: ${sheetTitle}`);
            continue;
          }

          sdrId = newSdr.id;
          console.log(`Created new SDR: ${sdrId}`);
        }

        // Fetch sheet data
        const range = `'${sheetTitle}'!A:I`; // Columns A through I
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${googleApiKey}`;
        const dataResponse = await fetch(dataUrl);

        if (!dataResponse.ok) {
          const errorText = await dataResponse.text();
          console.error(`Error fetching data for ${sheetTitle}:`, errorText);
          errors.push(`Failed to fetch data for: ${sheetTitle}`);
          continue;
        }

        const sheetData = await dataResponse.json();
        const rows = sheetData.values || [];

        if (rows.length < 2) {
          console.log(`Sheet ${sheetTitle} has no data rows`);
          continue;
        }

        // Parse header row to find column indices
        const headerRow = rows[0].map((h: string) => h?.toString().toLowerCase().trim() || '');
        console.log(`Headers: ${headerRow.join(', ')}`);

        // Column mapping (flexible - tries to match various names)
        const columnMap: Record<string, number> = {};
        headerRow.forEach((header: string, index: number) => {
          if (header.includes('data') || header.includes('date')) {
            columnMap.date = index;
          } else if (header.includes('ativad')) {
            columnMap.activated = index;
          } else if (header.includes('agend') && header.includes('dia')) {
            columnMap.scheduled_same_day = index;
          } else if (header.includes('agend') && header.includes('%')) {
            columnMap.scheduled_rate = index;
          } else if (header.includes('agend')) {
            columnMap.scheduled = index;
          } else if (header.includes('realiz')) {
            columnMap.attended = index;
          } else if (header.includes('comp') && header.includes('%')) {
            columnMap.attendance_rate = index;
          } else if (header.includes('vend')) {
            columnMap.sales = index;
          } else if (header.includes('conv') && header.includes('%')) {
            columnMap.conversion_rate = index;
          }
        });

        console.log(`Column mapping: ${JSON.stringify(columnMap)}`);

        // Process data rows
        const metricsToUpsert: SDRMetricRow[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          // Try to parse date
          const dateValue = row[columnMap.date ?? 0];
          if (!dateValue) continue;

          let parsedDate: string | null = null;

          // Try different date formats
          if (typeof dateValue === 'string') {
            // DD/MM/YYYY format
            const ddmmyyyy = dateValue.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (ddmmyyyy) {
              parsedDate = `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
            }
            // YYYY-MM-DD format
            const yyyymmdd = dateValue.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (yyyymmdd) {
              parsedDate = dateValue;
            }
          }

          if (!parsedDate) {
            console.log(`Skipping row ${i + 1}: invalid date "${dateValue}"`);
            continue;
          }

          const parseNumber = (value: unknown): number => {
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
              // Remove % and parse
              const cleaned = value.replace('%', '').replace(',', '.').trim();
              const num = parseFloat(cleaned);
              return isNaN(num) ? 0 : num;
            }
            return 0;
          };

          const metric: SDRMetricRow = {
            date: parsedDate,
            activated: parseNumber(row[columnMap.activated]),
            scheduled: parseNumber(row[columnMap.scheduled]),
            scheduled_rate: parseNumber(row[columnMap.scheduled_rate]),
            scheduled_same_day: parseNumber(row[columnMap.scheduled_same_day]),
            attended: parseNumber(row[columnMap.attended]),
            attendance_rate: parseNumber(row[columnMap.attendance_rate]),
            sales: parseNumber(row[columnMap.sales]),
            conversion_rate: parseNumber(row[columnMap.conversion_rate]),
          };

          metricsToUpsert.push(metric);
        }

        console.log(`Found ${metricsToUpsert.length} valid metrics for ${sheetTitle}`);

        // Upsert metrics
        if (metricsToUpsert.length > 0) {
          const metricsWithSdrId = metricsToUpsert.map(m => ({
            ...m,
            sdr_id: sdrId,
            source: 'google_sheets',
          }));

          const { error: upsertError } = await supabase
            .from('sdr_metrics')
            .upsert(metricsWithSdrId, {
              onConflict: 'sdr_id,date',
              ignoreDuplicates: false,
            });

          if (upsertError) {
            console.error(`Error upserting metrics for ${sheetTitle}:`, upsertError);
            errors.push(`Failed to save metrics for: ${sheetTitle}`);
          } else {
            totalMetricsImported += metricsToUpsert.length;
            sdrsProcessed++;
          }
        }
      } catch (sheetError) {
        console.error(`Error processing sheet ${sheetTitle}:`, sheetError);
        errors.push(`Error processing: ${sheetTitle}`);
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
