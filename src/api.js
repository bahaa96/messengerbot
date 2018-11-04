import fetch from "node-fetch";
import queryString from "query-string";
import request from "request"

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

const params = {
  "access_token": PAGE_ACCESS_TOKEN,
}

// Handles messages events
export function handleMessage(sender_psid, received_message) {
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
  // createBroadcastMessage()
}

// Handles messaging_postbacks events
export function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    recipient: {
      id: sender_psid
    },
    message: response
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

export function setProfile() {
  const body = {
    get_started:{
      payload: "Get Started"
    }
  }
  fetch(`https://graph.facebook.com/v2.6/me/messenger_profile?${queryString.stringify(params)}`, {
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