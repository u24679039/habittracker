const express = require('express');
const cors = require('cors');
const app = express();

// Allow requests from Vite's default frontend port
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ message: "Backend and Frontend are linked!" });
});

app.listen(5000, () => console.log('Backend running on port 5000'));