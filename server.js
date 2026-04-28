require('dotenv').config();
const express = require('express');
const app = express();

require('./jobs/dailySettle');

const cors = require('cors');
app.use(cors()); 

app.use(express.json());
app.use(require('./middleware/logger'));
app.use('/api', require('./routes/index'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
require('./config/web3');
