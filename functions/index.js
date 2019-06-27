// https://medium.com/linedevth/สร้าง-line-bot-ด้วย-messaging-api-และ-cloud-functions-for-firebase-20d284edea1b
// https://console.firebase.google.com/u/3/project/toy-bot/functions/list
// https://developers.line.biz/console/channel/1565809717/basic/

const functions = require("firebase-functions");
const request = require("request-promise");
const cron = require('node-cron'); // https://www.npmjs.com/package/node-cron
const runtimeOpts = { timeoutSeconds: 4, memory: "2GB" };
const REGION = "asia-east2";
const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message";
const LINE_UID = "U75e694bc4d695ac6df29dc35e2855707";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: "Bearer eHkRsHryQhzK/7eIz90giRk53KU6haItrnDmZmkOC5pb26KbupZXYOz79269TqDN6ovw2Sv04Mrf0natgATblFdXfO3g9HqdhOx6uX3bybaqrfm7oefBLlMvpCw2/tn8OW+f1+2/gl/0JGW7sUzQmgdB04t89/1O/w1cDnyilFU="
};
const OPENWEATHER_API = "https://api.openweathermap.org/data/2.5/weather/";

//--------------------------------------------------------------

exports.LineBotReply = functions.https.onRequest((req, res) => {
  var reqMessage = req.body.events[0].message.text

  if (reqMessage.toLowerCase() === 'show auto set') {
    pushMessage(req, 'Automated show SET Index is working')
    broadcastSETIndex(req, res)
  } else if (reqMessage.toLowerCase() === 'set') {
    console.log('choice SET')
    pushSETIndex(req, res, false)
  } else if (reqMessage.toLowerCase().startsWith('set')) {
    console.log('choice Stock')
    const stockCode = reqMessage.split(" ")[1];
    pushSETStock(req, res, stockCode)
  } else {
    pushMessage(req, 'Hi ' + reqMessage)
  }
  return res.status(200).send(req.method);
});


exports.LineBotBroadcast = functions.region(REGION).runWith(runtimeOpts).https.onRequest((req, res) => {
  const text = req.query.text;
  if (text !== undefined && text.trim() !== "") {
    return broadcast(res, text);
  } else {
    const ret = { message: "Text not found" };
    return res.status(400).send(ret);
  }
});

// --------------------------------- Push -------------------------------------

const multicast = async (res, uIds, msg) => {
  await request.post({
    uri: `${LINE_MESSAGING_API}/multicast`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      to: uIds,
      messages: [{ type: "text", text: msg }]
    })
  });
  return res.status(200).send({ message: `Multicast: ${msg}` });
};

const broadcast = async (res, msg) => {
  return request.post({
    uri: `${LINE_MESSAGING_API}/broadcast`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      messages: [{ type: "text", text: msg }]
    })
  });
  // return res.status(200).send({ message: `Broadcast: ${msg}` });
};

const pushMessage = (req, message) => {
  console.log("push message token -> " + req.body.events[0].replyToken)
  return request.post({
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: req.body.events[0].replyToken,
      messages: [{ type: "text", text: message }]
    })
  });
};

const reply = bodyResponse => {
  return request.post({
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: bodyResponse.events[0].replyToken,
      messages: [{ type: "text", text: JSON.stringify(bodyResponse) }]
    })
  });
};

//----------------------------- Function ---------------------------------

function pushSETIndex(req, res, isBroadcast) {
  var options = {
    uri: 'http://thai-stock.tskyonline.com/Set/GetSet',
    json: true
  };

  request.get(options, function (request, response, body) {
    if (req.method === "POST") {
      const setValue = body[0]
      const operator = setValue.changedPrice > 0 ? "+" : ""
      var message = "🇹🇭 " + setValue.code + " " 
      message = message + numberWithCommas(setValue.price.toFixed(2)) + " " 
      message = message + operator 
      message = message + setValue.changedPrice.toFixed(2) + " จุด \n" 
      message = message + "(" + operator + setValue.changedPercentage.toFixed(2) + "%) Volumn " 
      message = message + numberWithCommas(setValue.volumnBaht.toFixed(2)) + " ล้านบาท \n"
      message = message + "อ้างอิง: "+ setValue.references.toString()
      if (isBroadcast) {
        broadcast(res, message)
      } else {
        pushMessage(req, message)
      }
    }
  })
}

function pushSETStock(req, res, stockCode) {
  console.log('choice Stock -> ' + stockCode)
  var options = {
    uri: 'http://thai-stock.tskyonline.com/Stock/GetStock?code=' + stockCode,
    json: true
  };

  request.get(options, function (request, response, body) {
    if (req.method === "POST") {
      const stockValue = body
      const operator = stockValue.changedPrice > 0 ? "+" : "";
      var message = "🇹🇭 " + stockValue.code.toUpperCase() + " " 
      message = message + numberWithCommas(stockValue.price.toFixed(2)) + " " 
      message = message + operator 
      message = message + stockValue.changedPrice.toFixed(2) + " จุด \n" 
      message = message + "(" + operator + stockValue.changedPercentage.toFixed(2) + "%) Volumn " 
      message = message + numberWithCommas(stockValue.volumnBaht.toFixed(2)) + " บาท \n"
      message = message + "อ้างอิง: "+ stockValue.references.toString()
      pushMessage(req, message)
    }
  })
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function broadcastSETIndex(req, res) {
  // var task = cron.schedule('5 */5 * * * *', () => {
  //   const date = new Date();
  //   const hourDateTime = date.getHours()
  //   console.log("222 -> " + hourDateTime + " - " + date.getMinutes())
  // })
  // // task.destroy()
  // task.start()

  var task = cron.schedule('1 1 */1 * * 1,2,3,4,5', () => {
    const date = new Date();
    const hourDateTime = date.getHours()
    // if (hourDateTime > 9 || hourDateTime < 17) {
      pushSETIndex(req, res, true)
    // }
  })
  task.start()

  // var task = cron.schedule('0 1,30 9-17 * * 1-5', () => {
  //   pushSETIndex(req, res, true)
  // })
  // task.start()
}

//------------------------------------------------------------------------------