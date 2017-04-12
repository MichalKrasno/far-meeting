var express = require("express");
var app = express();
var router = express.Router();
var path = __dirname + "/";

var fs = require('fs');
var readline = require('readline');

//Initialize token save directcory
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

//Google API
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var filtering = require("./filtering");

//Google API info
var oauth2Client = new OAuth2(
    "963711263702-rfkieaohjall5iaci8258216qajdlt1u.apps.googleusercontent.com", //client_id
    "lJzore0LfsSa6EJzD3sIj2LY", // Secret
    "https://calendartest25.herokuapp.com/histogram" //Redirection URL - Should match with redirect url in google console
);


router.use(function (req,res,next) {
    console.log("/" + req.method);
    next();
});

app.use("/",router);
app.use('/vendor', express.static('vendor'));
app.use('/less', express.static('less'));
app.use('/js', express.static('js'));
app.use('/img', express.static('img'));
app.use('/css', express.static('css'));

// view engine setup
app.set('view engine', 'ejs');



//Is called on Get Started button click. For more security,loads API id and secret
// in the backend and redirects to Sign In page
router.get("/redirect",function(req,res){



    var scopes = ['https://www.googleapis.com/auth/calendar.readonly'];

    var url = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',

        // If you only need one scope you can pass it as a string
        scope: scopes,

        // Optional property that passes state parameters to redirect URI
        // state: { foo: 'bar' }
    });

    res.redirect(url);


});


/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.

function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}
 */
router.get("/logout",function (req,res) {
    var code= req.query.code;

    //If the code parameter is defined
    if(code != undefined){
        oauth2Client.getToken(code, function (err, token) {
console.log(token);
           // res.redirect("https://accounts.google.com/o/oauth2/revoke?token=" + token );


        })

    }
});



// When google API sends response
router.get("/histogram",function(req,res){
    var code= req.query.code;

    //If the code parameter is defined
    if(code != undefined){


        //Get token depending on the returned code
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
          //  storeToken(token);
console.log((new Date()).getTime() + (1000 * 60 * 60 * 24));
            //Start filtering process
            filtering.listEvents(oauth2Client,function (histogram) {    //When filtering is done, render the page and send all data
               console.log(histogram);
                res.render('histogram', {

                    histogram: histogram
                });
            })

        });

    }
});

router.get("/",function(req,res){
    res.render('index');
});


app.listen(process.env.PORT || 3000,function(){
    console.log("Live at Port 3000 or " + process.env.PORT);
});