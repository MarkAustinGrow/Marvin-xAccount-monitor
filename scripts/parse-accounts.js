require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to extract X handles from the markdown file
async function extractHandles() {
  try {
    const filePath = path.join(__dirname, '..', 'x-accounts.txt');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Regular expression to match Twitter handles in the format @username
    const handleRegex = /@([A-Za-z0-9_]+)/g;
    const matches = content.match(handleRegex);
    
    if (!matches) {
      console.log('No Twitter handles found in the file.');
      return [];
    }
    
    // Remove @ symbol and remove duplicates
    const handles = [...new Set(matches.map(handle => handle.substring(1)))];
    console.log(`Found ${handles.length} unique Twitter handles.`);
    
    return handles;
  } catch (error) {
    console.error('Error extracting handles:', error);
    return [];
  }
}

// Function to insert handles into the x_accounts table
async function insertHandlesIntoDatabase(handles) {
  try {
    console.log('Inserting handles into the x_accounts table...');
    
    // We don't need to create the table here since we've already created it manually in Supabase
    console.log('Using existing x_accounts table in Supabase...');
    
    // Insert handles into the x_accounts table
    for (const handle of handles) {
      const { error } = await supabase
        .from('x_accounts')
        .upsert({ 
          handle, 
          platform: 'x',
          priority: 3 // Default priority
        }, { 
          onConflict: 'handle',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error(`Error inserting handle ${handle}:`, error);
      } else {
        console.log(`Inserted or updated handle: ${handle}`);
      }
    }
    
    console.log('Finished inserting handles into the x_accounts table.');
  } catch (error) {
    console.error('Error inserting handles into database:', error);
  }
}

// Main function
async function main() {
  const handles = await extractHandles();
  
  if (handles.length > 0) {
    await insertHandlesIntoDatabase(handles);
  }
}

// Run the main function
main()
  .then(() => {
    console.log('Account parsing and database insertion completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in main process:', error);
    process.exit(1);
  });
