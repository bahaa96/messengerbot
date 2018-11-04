import fetch from "node-fetch";
import moment from "moment";
import {getDisplayedDay} from "./utils";
import {createBroadcastMessage} from "./api"

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

let response = []


export function loadData(offset = "") {
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
