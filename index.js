const express = require("express"),
  bodyParser = require('body-parser'),
  request = require('request'),
  fetch = require('node-fetch'),
  moment = require('moment'),
  CronJob = require('cron').CronJob;

const app = express()

app.use(bodyParser.json()); // creates express http server

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// new CronJob("0 17 * * 4", function() {
new CronJob("* * * * *", function() {
  loadData("", (msg) => {
    createBroadcastMessage(msg)
  })
}, null, true, 'America/Los_Angeles');



app.get("/ping", (req, res) => {
  res.send("Hello World !");
})

app.get('/webhook', (req, res) => {
// Your verify token. Should be a random string.
  let VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

app.post('/webhook', (req, res) => {

  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });

    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;

  // Check if the message contains text
  if (received_message.text) {

    // Create the payload for a basic text message
    response = {
      "text": `You sent the message: "${received_message.text}". Now send me an image!`
    }
  }

  // Sends the response message
  // callSendAPI(sender_psid, response);
  createBroadcastMessage()
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

function createBroadcastMessage(message) {
  // Construct the message body
  let body = {
    "messages": [
      {
        "dynamic_text": {
          "text": message,
            "fallback_text": message.replace("{{first_name}}", "friend")
        }
      },
    ]
  }

  // Creates a broadcast message ID
  request({
    "uri": "https://graph.facebook.com/v2.11/me/message_creatives",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": body
  }, (err, res, body) => {
    if (!err) {
      console.log("Successfully created a broadcast message");
      const message_creative_id = body["message_creative_id"]
      console.log("message_creative_id: ", message_creative_id);
      sendBroadcastMessage(message_creative_id)
    } else {
      console.error("Unable to send message:" + err);
    }
  });

}

function sendBroadcastMessage(message_creative_id) {
  // Broadcasts the message
  request({
    "uri": "https://graph.facebook.com/v2.11/me/broadcast_messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": {
      "message_creative_id": message_creative_id,
      "notification_type": "REGULAR",
      "messaging_type": "RESPONSE",
      "tag": "CONFIRMED_EVENT_REMINDER"
    }
  }, (err, res, body) => {
    if (!err) {
      console.log("Successfully sent a broadcast message");

    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

let response = []


function loadData(offset = "") {
  console.log("Fetching.....");
  fetch(`https://api.airtable.com/v0/appmDngHl6n1PvFv7/Table%201?api_key=${ AIRTABLE_API_KEY }&offset=${ offset }`)
    .then(res => res.json())
    .then(json => {
      response = [...response, ...json.records]
      if(json.offset) {
        loadData(json.offset)
      }
      else  {
        const { nextWeek, recentEvents } = handleRecords(response)
        response = []
        const message = renderNextWeekEvents(recentEvents, nextWeek)
        createBroadcastMessage(message)
      }
    })
    .catch(e => {
      console.log(e.message)
    })
}


function handleRecords(records) {
  const nextWeek = []
  const recentEvents = []

  records.forEach(function(record) {
    const eventCreate= moment(record.fields['Created time'])
    const eventStart =  moment(record.fields['Start time'])
    if( eventCreate.isBetween(moment().subtract(7, "d"), moment())) {
      recentEvents.push(record)
    }
    if(eventStart.isBetween(moment(), moment().add(7, "d"))) {
      nextWeek.push(record)
    }
  });
  return {
    nextWeek,
    recentEvents
  }
}

function handleNextWeekEvents(nextWeek) {
  const output = [];
  nextWeek.sort((a, b) => {
    if (moment(a.fields["Start time"]).isAfter(b.fields["Start time"]))
      return 1;
    if (moment(a.fields["Start time"]).isBefore(b.fields["Start time"]))
      return -1;
    return 0;
  });
  nextWeek.forEach(record => {
    const startDate = new Date(record.fields["Start time"]);
    const out = `- ${record.fields.Name} (${getDisplayedDay(startDate)} ${record.fields["City"]})`;
    output.push(out + "\n")
  });
  return output;
};

function handleRecentEvents(recentEvents) {
  const output= []
  recentEvents.sort((a, b) => {
    if(moment(a.fields["Start time"]).isAfter(b.fields["Start time"]))
      return 1
    if(moment(a.fields["Start time"]).isBefore(b.fields["Start time"]))
      return -1
    return 0
  })
  recentEvents.forEach(record => {
    const date = new Date(record.fields["Start time"])
    const day = `${ date.getMonth() + 1 }/${ date.getDate() }`
    let out = ""
    try {
      out = `- ${ record.fields.Name } (${ day }: ${ record.fields["City"] })`
      output.push(out + "\n")
    }
    catch (e) {
      console.log(e.message)
    }
  })
  return output
}

function renderNextWeekEvents(recentEvents, nextWeekEvents) {
  return (`
Salam {{first_name}} 👋 \n\n=========================
\n\n
Here are the events happening over the next 7 days: 

${handleNextWeekEvents(nextWeekEvents).map(el => el).join("")}
\n
Events added last week:

${handleRecentEvents(recentEvents).map(el => el).join("")}


To view the details for any of these events, visit:
https://muslim.events
`)
}


function getDayName(num) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  if (num === 0) return days.pop()
  return days[num - 1]
}

//displays today, tomorrow, or day of week
function getDisplayedDay(dateDeep) {
  let date = new Date(dateDeep.getTime());
  let todaysDate = new Date();
  let tomorrowsDate = new Date();
  tomorrowsDate.setDate(todaysDate.getDate() + 1);

  if (date.setHours(0, 0, 0, 0) === todaysDate.setHours(0, 0, 0, 0)) {
    return "Today";
  } else if (date.setHours(0, 0, 0, 0) === tomorrowsDate.setHours(0, 0, 0, 0)) {
    return "Tomorrow";
  } else {
    return getDayName(date.getDay());
  }
}

app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));
