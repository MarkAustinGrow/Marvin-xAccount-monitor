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
      title: 'Marvin Account Monitor - Account Review',
      page: 'review'
    });
  } catch (error) {
    console.error('Error rendering home page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Route for tweet cache page
app.get('/tweets', async (req, res) => {
  try {
    // Get all accounts with their tweets
    const accountsWithTweets = await db.getAllAccountsWithTweets();
    
    // Render the tweets page
    res.render('tweets', { 
      accountsWithTweets,
      title: 'Marvin Account Monitor - Tweet Cache',
      page: 'tweets'
    });
  } catch (error) {
    console.error('Error rendering tweets page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Route for account management page
app.get('/accounts', async (req, res) => {
  try {
    // Get all accounts
    const accounts = await db.getAccountsToMonitor();
    
    // Render the accounts management page
    res.render('accounts', { 
      accounts,
      title: 'Marvin Account Monitor - Manage Accounts',
      page: 'accounts'
    });
  } catch (error) {
    console.error('Error rendering accounts management page:', error);
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

// API endpoint to add a new account
app.post('/api/accounts', async (req, res) => {
  try {
    const { handle, priority } = req.body;
    
    // Validate input
    if (!handle) {
      return res.status(400).json({ success: false, error: 'Account handle is required' });
    }
    
    // Remove @ symbol if present
    const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
    
    // Add the account
    const result = await db.addAccount(cleanHandle, priority);
    
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error adding account:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// API endpoint to remove an account
app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove the account
    const result = await db.removeAccount(id);
    
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error removing account:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// API endpoint to get all accounts
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await db.getAccountsToMonitor();
    res.json({ success: true, accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
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
