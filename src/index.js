import express from "express"
import bodyParser from "body-parser"
import {CronJob} from "cron"
import {loadData} from "./api"
import sendEmail from "./mailer"
import {renderEvents} from "./formatting"
import {setProfile, handlePostback, handleMessage, createBroadcastMessage} from "./api"

require('dotenv').config()

const app = express()

app.use(bodyParser.json()); // creates express http server


// To send a message every minute for any testing purpose
// replace the cron timing string with this
// new CronJob("* * * * *", function() {

// new CronJob("0 17 * * 4", function() {
//   loadData().then(({nextWeek}) => {
//     const message = renderEvents(nextWeek)
//     createBroadcastMessage(message)
//   }
// }, null, true, 'America/Los_Angeles');


new CronJob("0 11 * * 4", function() {
  loadData().then(({nextWeek}) => {
    sendEmail(nextWeek);
  }).catch((e) => {
    console.log(e.message);
  })
}, null, true, 'America/Los_Angeles');


// Setting Messenger profile like Get Started Button and greeting message.
setProfile();


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

app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));
