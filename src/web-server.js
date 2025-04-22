const express = require('express');
const basicAuth = require('express-basic-auth');
const db = require('./db');
const path = require('path');
const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Set up basic authentication
const username = process.env.WEB_USERNAME || 'admin';
const password = process.env.WEB_PASSWORD || 'password';

app.use(basicAuth({
  users: { [username]: password },
  challenge: true,
  realm: 'Marvin Account Monitor'
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', async (req, res) => {
  try {
    // Get accounts to review
    const accountsToReview = await db.getAccountsToReview();
    
    // Get all accounts for reference
    const allAccounts = await db.getAccountsToMonitor();
    
    // Render the home page
    res.render('index', { 
      accountsToReview,
      allAccounts,
      title: 'Marvin Account Monitor'
    });
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// API endpoint to update account status
app.post('/api/accounts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Update account status
    const success = await db.updateAccountReviewStatus(id, status, notes);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update account status' });
    }
  } catch (error) {
    console.error('Error updating account status:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Start the server
function startServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`Web server running on port ${PORT}`);
      resolve(server);
    });
    
    server.on('error', (error) => {
      console.error('Error starting web server:', error);
      reject(error);
    });
  });
}

module.exports = { startServer };
