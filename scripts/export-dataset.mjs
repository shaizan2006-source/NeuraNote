import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

/**
 * This script exports Q&A pairs from the 'qa_cache' table in Supabase
 * and formats them into a JSONL dataset for OpenAI fine-tuning.
 */
async function generateDataset() {
  try {
    // 1. Load .env.local directly to get database keys
    const envContent = await fs.readFile('.env.local', 'utf-8');
    let supabaseUrl = '';
    let supabaseKey = '';
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
      if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=')[1].trim();
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) in .env.local');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching questions from Supabase `qa_cache` table...');
    
    // Fetch all Q&A data
    const { data: cacheEntries, error } = await supabase
      .from('qa_cache')
      .select('question, answer, domain');

    if (error) {
      console.error('Error fetching data from Supabase:', error.message);
      process.exit(1);
    }

    if (!cacheEntries || cacheEntries.length === 0) {
      console.log('No entries found in `qa_cache`. Run some queries in Ask-My-Notes to generate data first!');
      process.exit(0);
    }

    console.log(`Found ${cacheEntries.length} entries. Formatting to JSONL...`);

    // 2. Format into JSONL structure expected by OpenAI / standard LLMs:
    // {"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
    const jsonlLines = cacheEntries.map(entry => {
      const domainMsg = entry.domain ? ` You specialize in ${entry.domain}.` : '';
      const messages = [
        { 
          role: 'system', 
          content: `You are an AI study coach for university students.${domainMsg} Provide clear, structured, and accurate answers.` 
        },
        { role: 'user', content: entry.question },
        { role: 'assistant', content: entry.answer }
      ];
      return JSON.stringify({ messages });
    });

    const outputPath = 'fine_tuning_dataset.jsonl';
    await fs.writeFile(outputPath, jsonlLines.join('\n'), 'utf-8');
    
    console.log(`\n✅ Successfully saved fine-tuning dataset to ${outputPath}!`);
    console.log(`\nYou can now upload ${outputPath} to OpenAI or HuggingFace to train your custom model.`);

  } catch (error) {
    console.error('Unexpected script error:', error);
  }
}

generateDataset();
