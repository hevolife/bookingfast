const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('dist'));

// API Routes
app.use('/api', require('./api/stripe-webhook'));
app.use('/api', require('./api/stripe-checkout'));
app.use('/api', require('./api/list-users'));
app.use('/api', require('./api/create-app-user'));
app.use('/api', require('./api/delete-app-user'));
app.use('/api', require('./api/public-booking-data'));
app.use('/api', require('./api/send-brevo-email'));
app.use('/api', require('./api/invite-team-member'));
app.use('/api', require('./api/create-affiliate-account'));

// Servir l'application React pour toutes les autres routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📱 Application: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});