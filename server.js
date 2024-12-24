require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const handicapperRoutes = require('./routes/handicapperRoutes');
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const adminController = require('./controllers/adminController');
var cron = require('node-cron');

const app = express();

app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(express.json());
const allowedOrigins = ['http://admin.hitthepick.com', 'http://hitthepick.com'];

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/handicapper', handicapperRoutes);
app.use('/api/user', userRoutes);

// cron.schedule('46 19 * * *', async () => {
//   try {
//       console.log('Running sports data sync cron job...');
//       await adminController.syncSportsData();
//   } catch (error) {
//       console.error('Error in sports data sync cron job:', error.message);
//   }
// });

cron.schedule('30,0 * * * *', async () => {
  try {
      console.log('Running sports data sync cron job...');
      await adminController.syncSportsData();
  } catch (error) {
      console.error('Error in sports data sync cron job:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'America/New_York'
});

// cron.schedule('30,0 * * * *', async () => {
//   try {
//       console.log('Running picks results cron job...');
//       await adminController.checkPickStatus();
//   } catch (error) {
//       console.error('Error in picks results cron job:', error.message);
//   }
// }, {
//   scheduled: true,
//   timezone: 'America/New_York'
// });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
