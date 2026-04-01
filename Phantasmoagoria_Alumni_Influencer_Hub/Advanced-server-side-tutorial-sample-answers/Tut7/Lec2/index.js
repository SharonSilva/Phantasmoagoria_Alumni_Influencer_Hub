express = require('express');
app = express();

app.use(logging);

app.get('/', auth,(req, res) => {
  console.log('Request received');
  res.send("<h1>Hello</h1>");
});

app.get('/about', (req, res) => {
  console.log('About page');
  res.send("world");
});


function logging(req, res, next) {
    console.log('Im log');
    next();
  }

function auth(req, res, next) {
  if(req.query.admin === 'true') {
    console.log('Admin');
  } else {
    console.log('Not Admin');
  }
  next();
}

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
