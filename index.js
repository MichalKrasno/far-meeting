///NOTES
// Create a folder called "public" with a folder called "views". This is where index.html will live (public/views/index.html)
// - https://github.com/sblaurock/evalsh/blob/master/Procfile
// - web: node index.js
// - https://github.com/sblaurock/evalsh
/// ---


// Options
var options = {
  port: 8080
};

var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var nunjucks = require('nunjucks');

var app = express();
var server = new http.Server(app);

app.use(bodyParser.json());
app.use(express.static(`${__dirname}`));

// Setup Nunjucks
nunjucks.configure('views', {
  autoescape: true,
  express: app,
  watch: true
});

app.get('/', (req, res) => {
  var ipv4 = req.clientIp;
  var geo = (ipv4 ? geoip.lookup(ipv4) : null);

  res.render('index.html', {
    dataToBePassedToClient: 'abc',
    test: 'test'
  });
});


server.listen(app.get('port'), () => {
  logger.info(`Server listening on port ${app.get('port')}`);
});