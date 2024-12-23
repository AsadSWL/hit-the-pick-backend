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

cron.schedule('50 20 * * *', async () => {
  try {
      console.log('Running sports data sync cron job...');
      await adminController.syncSportsData();
  } catch (error) {
      console.error('Error in sports data sync cron job:', error.message);
  }
});

// cron.schedule('0 8,14,20 * * *', async () => {
//   try {
//       console.log('Running sports data sync cron job...');
//       await adminController.syncSportsData();
//   } catch (error) {
//       console.error('Error in sports data sync cron job:', error.message);
//   }
// }, {
//   scheduled: true,
//   timezone: 'America/New_York'
// });

// cron.schedule('0 8,14,20 * * *', async () => {
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

app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/handicapper', handicapperRoutes);
app.use('/api/user', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
