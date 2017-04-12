var google = require('googleapis');


function getCalendarIds(auth) {
    return new Promise(function (resolve, reject) {
        var calendar = google.calendar('v3');

        calendar.calendarList.list({
            auth: auth
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return;
            }
            var calendars = response.items;
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
                console.log(calendarIds);
                resolve(calendarIds);
            }
        });
    })
}

/**
 * Retrieve and store all events in the last 30 days of a particular calendarId
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getEvents(auth, calId) {
    return new Promise(function (resolve, reject) {
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
            if (events.length == 0) {
                console.log('No events found.');
                resolve(null);
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

                    } catch (error) {
                        //console.log(error);
                        //Do nothing as we don't care about events that are all day or have no attendees
                    }
                }
                resolve(filteredEvents);
            }
        });
    })
}

/**
 * Lists all events in the last 30 days for all calendars that the authorized user can seen
 * Also calculates the histogram of # of meetings by # of attendees
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
module.exports.listEvents = function (auth,callback) {
    var calendar = google.calendar('v3');

    getCalendarIds(auth)
        .then(function (calendarIds) {
            return Promise.all(calendarIds.map(function (id) {
                return getEvents(auth, id);
            }))
        })
        .then(function (allCalendarsEvents) {
            var allEvents = [];
            var allEventsDeduped = [];
            var histogram = [];
console.log(allCalendarsEvents);

            var temp = false;
            for (var i = 0; i < allCalendarsEvents.length; i++) {
                console.log(allCalendarsEvents[i]);

                if (allCalendarsEvents[i] != null) {
                   temp = true;
                    break;

                }
            }

            if(temp == true) {

                for (var i = 0; i <= 30; i++) {
                    histogram.push(0);
                } //initialize histogram to all 0's

                for (var i = 0; i < allCalendarsEvents.length; i++) {
                    if(allCalendarsEvents[i] != null){
                        if (allCalendarsEvents[i].length > 0) { //Check to make sure the calendar isn't empty
                            for (var j = 0; j < allCalendarsEvents[i].length; j++) {
                                var event = allCalendarsEvents[i][j];
                                //console.log('dummy test')
                                //console.log('%s - %s - %s - %s - %s', event.id, event.start.dateTime, event.attendees.length, event.summary);
                                allEvents.push(event); //create an array of all the events from all calendars
                            }
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

                var flagForHistogram = false;

                //Build the histogram data
                for (var i = 0; i <= 30; i++) {
                    for (var j = 0; j < allEventsDeduped.length; j++) {
                        if(allEventsDeduped[j] != undefined) {
                            if (allEventsDeduped[j].attendees.length == i) {
                                histogram[i]++;
                            }
                            flagForHistogram = true;
                        }
                    }
                }
                if(flagForHistogram == true) {
                    callback(histogram);
                }
                else{
                    callback(null);
                }
            }
            else {
                callback(null)
            }
        })
        .catch(function (error) {
            console.log('Caught error', error);
        });

};