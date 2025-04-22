require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Function to extract X handles from the markdown file
function extractHandles() {
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

// Main function
function main() {
  console.log('Testing account parsing from x-accounts.txt...');
  
  const handles = extractHandles();
  
  if (handles.length > 0) {
    console.log('\nExtracted handles:');
    handles.forEach((handle, index) => {
      console.log(`${index + 1}. @${handle}`);
    });
    
    console.log('\nThis is a dry run - no handles were inserted into the database.');
    console.log('To insert these handles into the database, run: npm run parse-accounts');
  }
}

// Run the main function
main();
