var express = require("express");
var app = express();
var router = express.Router();
var path = __dirname + "/";

router.use(function (req,res,next) {
  console.log("/" + req.method);
  next();
});

router.get("/",function(req,res){
  res.sendFile(path + "index.html");
});

app.use("/",router);
app.use('/vendor', express.static('vendor'));
app.use('/less', express.static('less'));
app.use('/js', express.static('js'));
app.use('/img', express.static('img'));
app.use('/css', express.static('css'));

app.use("*",function(req,res){
  res.sendFile(path + "404.html");
});

app.listen(process.env.PORT || 3000,function(){
  console.log("Live at Port 3000 or " + process.env.PORT);
});