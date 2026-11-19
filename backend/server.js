// construction new/backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const projectRoutes = require('./routes/projectRoutes');
const workerRoutes = require('./routes/workerRoutes');
const roleRoutes = require('./routes/roleRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const advanceRoutes = require('./routes/advanceRoutes');
const materialRoutes = require('./routes/materialRoutes');
const activityRoutes = require('./routes/activityRoutes');
const reportRoutes = require('./routes/reportRoutes');
const rentRoutes = require('./routes/rentRoutes.js');
const strangerWorkerRoutes = require('./routes/strangerWorkerRoutes');
const walletRoutes = require('./routes/walletRoutes');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Main API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/advances', advanceRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/rent', rentRoutes);
app.use('/api/stranger-workers', strangerWorkerRoutes); // This should be line 41
app.use('/api/wallet', walletRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

