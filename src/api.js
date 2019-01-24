import fetch from "node-fetch";
import queryString from "query-string";
import request from "request"
import {handleRecords} from "./formatting";

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

const params = {
  "access_token": PAGE_ACCESS_TOKEN,
}

const infoMessages = [
  'info',
  'help',
  'any updates'
]

// Handles messages events
export function handleMessage(sender_psid, received_message) {
  let response;

  // Check if the message contains text
  if (received_message.text) {
    if(received_message.text.trim().toLowerCase() === "get started") {
      const message1 = "You get started...";
      const message2 = `Jk, great to meet you {{first_name}}! Watch out for a message from us soon 👀`

      response = {
        "text": message1
      }
      // Sends the response message
      callSendAPI(sender_psid, response);
      setTimeout(() => {
        response = {
          "dynamic_text": {
            "text": message2,
            "fallback_text": message2.replace("{{first_name}}", "friend")
          }
        }
        callSendAPI(sender_psid, response);
      }, 60000);
    }
    else {
      let message;
      if(infoMessages.includes(received_message.text.trim().toLowerCase())) {
        message = "You'll get a message of the next week events every Thursday";
      }
      else {
        message = "Thank you for subscribing to our bot we'll respond to you very soon";
      }

      response = {
        "text": message
      }
      // Sends the response message
      callSendAPI(sender_psid, response);
    }
  }
}

// Handles messaging_postbacks events
export function handlePostback(sender_psid, received_postback) {
  if (received_postback.payload) {
    if(received_postback.payload.trim().toLowerCase() === "get started") {
      const message1 = "You get started...";
      const message2 = `Jk, great to meet you {{first_name}}! Watch out for a message from us soon 👀`

      response = {
        "text": message1
      }
      // Sends the response message
      callSendAPI(sender_psid, response);
      setTimeout(() => {
        response = {
          "dynamic_text": {
            "text": message2,
            "fallback_text": message2.replace("{{first_name}}", "friend")
          }
        }
        callSendAPI(sender_psid, response);
      }, 60000);
    }
  }
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
    "uri": "https://graph.facebook.com/v3.2/me/messages",
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

export function createBroadcastMessage(message) {
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
    "uri": "https://graph.facebook.com/v3.2/me/message_creatives",
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
    "uri": "https://graph.facebook.com/v3.2/me/broadcast_messages",
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

export function setProfile() {
  const body = {
    get_started:{
      payload: "Get Started"
    }
  }
  fetch(`https://graph.facebook.com/v3.2/me/messenger_profile?${queryString.stringify(params)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body)
  })
    .then(res => res.json())
    .then(json => {
      console.log(json);
    })
    .catch(e => {
      console.log(e.message);
    })
}

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

let response = []

export function loadData(offset = "") {
  console.log("Fetching.....");
  return fetch(`https://api.airtable.com/v0/appmDngHl6n1PvFv7/Table%201?api_key=${ AIRTABLE_API_KEY }&offset=${ offset }`)
    .then(res => res.json())
    .then(json => {
      response = [...response, ...json.records]
      if(json.offset) {
        return loadData(json.offset)
      }
      else  {
        const output = handleRecords(response)
        response = []
        return output
      }
    })
    .catch(e => {
      console.log(e.message)
    })
}

let emails = []

export function fetchNewsletterEmails(offset = "") {
  return fetch(`https://api.airtable.com/v0/apptpabSI7jqL9qyl/Table%201?api_key=${ AIRTABLE_API_KEY }&offset=${ offset }`)
    .then(res => res.json())
    .then(json => {
      emails = [...emails, ...json.records]
      if(json.offset) {
        return fetchNewsletterEmails(json.offset)
      }
      else  {
        const output = emails.map(email => email.fields.Name)
        emails = []
        return output
      }
    })
    .catch(e => {
      console.log(e.message)
    })
}
