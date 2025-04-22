require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Simple query to test the connection
    const { data, error } = await supabase.from('x_accounts').select('count()', { count: 'exact' });
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist yet
        console.log('The x_accounts table does not exist yet. This is normal if you haven\'t run the application yet.');
        console.log('Connection to Supabase was successful, but tables need to be created.');
      } else {
        console.error('Error connecting to Supabase:', error);
        return false;
      }
    } else {
      console.log('Successfully connected to Supabase!');
      console.log(`Found ${data[0].count} accounts in the x_accounts table.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error testing Supabase connection:', error);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('Database connection test completed successfully.');
    } else {
      console.error('Database connection test failed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error during database connection test:', error);
    process.exit(1);
  });
