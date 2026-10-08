//Express server set up
const express = require('express');
const cors = require('cors');
const { prisma } = require('./prisma/client');





//EXpress app init 
const app = express();




//enable Cors for all routes prevents "cors blocked"
app.use(cors());



//query database to retrieve User table
app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});



//server to port 3000 and teriminal log
app.listen(3000, () => {
  console.log('Server running on port 3000');
});