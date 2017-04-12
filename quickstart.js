var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API.
  authorize(JSON.parse(content), eventslist);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function (err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function (code) {
    rl.close();
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
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

/**
 * Retrive and store the calendarId of every calendar the authorized user has access to.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getCalendarIds(auth,callback) {

    var calendar = google.calendar('v3');

    calendar.calendarList.list({
      auth: auth
    }, function (err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      var calendars = response.items;
        console.log("Calendars " + calendars[1].id);
      var calendarIds = [];
      if (calendars.length == 0) {
        console.log('No calendars found.');
      } else {
        console.log('All calendars this user has access to:')
        for (var i = 0; i < calendars.length; i++) {
          var cal = calendars[i];
          //console.log('%s - %s', cal.id, cal.summary);
          if ((cal.id.indexOf('#contacts@') == -1) && (cal.id.indexOf('#holiday@') == -1)) { //ignore the 'contacts' and 'holiday' calendars
            calendarIds.push(cal.id);
          }
        }
        console.log("ids- " + calendarIds);
        callback(calendarIds);
      }
    });

}

/**
 * Retrieve and store all events in the last 30 days of a particular calendarId
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getEvents(auth, calId,callback) {

    var calendar = google.calendar('v3');
    var filteredEvents = [];

    calendar.events.list({
      auth: auth,
      calendarId: calId,
      timeMax: (new Date()).toISOString(),
      timeMin: (new Date(new Date().setDate(new Date().getDate() - 30))).toISOString(),  //Oldest event should be 30 days ago
      maxResults: 2500, //Max 2500, if you fill 31 days with 30min meetings from 8-6 it's 620 meetings, so 2500 would accomodate 4 months of that. Should be fine, but maybe you should print the date of the earliest meeting recorded
      singleEvents: true, //If a meeting is recurring show each event separately
      orderBy: 'startTime'
    }, function (err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        return;
      }
      var events = response.items;
        console.log("events"+events[0].attendees.length)
      if (events.length == 0) {
        console.log('No events foundattendees.');
      } else {
        console.log('All events in last 30 days for calendar:', calId);

        for (var i = 0; i < events.length; i++) {
          var event = events[i];
          try {
            var numattendees = event.attendees.length; //Sometimes events can have no attendees
            // TODO: Need to check if any of the attendees are a 'resource' and remove them from the count, otherwise we're overcounting.
            // attendees[i].resource = true; https://developers.google.com/google-apps/calendar/v3/reference/events
            var start = event.start.dateTime; //All day event's have event.start.date instead
            if (start == undefined) throw "All day event";
            var duration = Math.abs((new Date(event.end.dateTime)).valueOf() - (new Date(event.start.dateTime)).valueOf()) / (60 * 60 * 1000);
            if (duration >= 24) throw "Multi-day event, ignoring";

            //console.log('%s - %s - %s - %s - %s', event.id, start, duration, numattendees, event.summary);
            filteredEvents.push(event);
            console.log("event" + event);
          } catch (error) {
            //console.log(error);
            //Do nothing as we don't care about events that are all day or have no attendees
          }
        }
        callback(filteredEvents);
      }
    });

}

/**
 * Lists all events in the last 30 days for all calendars that the authorized user can seen
 * Also calculates the histogram of # of meetings by # of attendees
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

function eventslist(auth){

    getCalendarIds(auth,function (calId) {

        getEvents(auth, calId,function (allCalendarsEvents) {
console.log("a1" + allCalendarsEvents)
            var allEvents = [];
            var allEventsDeduped = [];
            var histogram = [];
            for (var i = 0; i <= 30; i++){ histogram.push(0);} //initialize histogram to all 0's

            for (var i = 0; i < allCalendarsEvents.length; i++) {
                if (allCalendarsEvents[i].length > 0) { //Check to make sure the calendar isn't empty
                    for (var j = 0; j < allCalendarsEvents[i].length; j++) {
                        var event = allCalendarsEvents[i][j];
                        //console.log('dummy test')
                        //console.log('%s - %s - %s - %s - %s', event.id, event.start.dateTime, event.attendees.length, event.summary);
                        allEvents.push(event); //create an array of all the events from all calendars
                    }
                }
            }
            allEventsDeduped.push(allEvents[0]); //Seed the dedupe list with the first event so there's something to compare below
            for (var i = 0; i < allEvents.length; i++) {
                for (var j = 0; j < allEventsDeduped.length; j++) {
                    if (allEvents[i].id == allEventsDeduped[j].id) { //If the event is already in the dedupe list, skip it
                        break;
                    }
                    if (j == allEventsDeduped.length - 1) { //if you get to the end of the dedupe list and havn't seen this event, add it to the dedupe list
                        allEventsDeduped.push(allEvents[i]);
                    }
                }
            }

            //Build the histogram data
            for (var i = 0; i <= 30; i++){
                for (var j = 0; j < allEventsDeduped.length; j++){
                    if (allEventsDeduped[j].attendees.length == i){
                        histogram[i]++;
                    }
                }
            }
            console.log(histogram);

        })



        })



}

function listEvents(auth) {
  var calendar = google.calendar('v3');

 var a =  getCalendarIds(auth)
      .then(function (calendarIds) {
        return Promise.all(calendarIds.map(function (id) {
          return getEvents(auth, id);
        }))
      });

  console.log("aas"+a.length);
     /* .then(function (allCalendarsEvents) {
        var allEvents = [];
        var allEventsDeduped = [];
        var histogram = [];
        for (var i = 0; i <= 30; i++){ histogram.push(0);} //initialize histogram to all 0's

        for (var i = 0; i < allCalendarsEvents.length; i++) {
          if (allCalendarsEvents[i].length > 0) { //Check to make sure the calendar isn't empty
            for (var j = 0; j < allCalendarsEvents[i].length; j++) {
              var event = allCalendarsEvents[i][j];
              //console.log('dummy test')
              //console.log('%s - %s - %s - %s - %s', event.id, event.start.dateTime, event.attendees.length, event.summary);
              allEvents.push(event); //create an array of all the events from all calendars
            }
          }
        }
        console.log("4-" + allEvents);

        allEventsDeduped.push(allEvents[0]); //Seed the dedupe list with the first event so there's something to compare below
        console.log("4-" + allEventsDeduped);

        for (var i = 0; i < allEvents.length; i++) {
          for (var j = 0; j < allEventsDeduped.length; j++) {
            if (allEvents[i].id == allEventsDeduped[j].id) { //If the event is already in the dedupe list, skip it
              break;
            }
            if (j == allEventsDeduped.length - 1) { //if you get to the end of the dedupe list and havn't seen this event, add it to the dedupe list
              allEventsDeduped.push(allEvents[i]);
            }
          }
        }
console.log("5-" + allEventsDeduped);
        //Build the histogram data
        for (var i = 0; i <= 30; i++){
          for (var j = 0; j < allEventsDeduped.length; j++){

          }
        }
        console.log(histogram);

      })
      .catch(function (error) {
        console.log('Caught error', error);
      });
*/
}