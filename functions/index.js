// https://medium.com/linedevth/สร้าง-line-bot-ด้วย-messaging-api-และ-cloud-functions-for-firebase-20d284edea1b
// https://console.firebase.google.com/u/3/project/toy-bot/functions/list
// https://developers.line.biz/console/channel/1565809717/basic/

const functions = require("firebase-functions");
const request = require("request-promise");
const runtimeOpts = { timeoutSeconds: 4, memory: "2GB" };
const REGION = "asia-east2";
const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message";
const LINE_UID = "U75e694bc4d695ac6df29dc35e2855707";
const LINE_HEADER = {
  "Content-Type": "application/json",
  Authorization: "Bearer eHkRsHryQhzK/7eIz90giRk53KU6haItrnDmZmkOC5pb26KbupZXYOz79269TqDN6ovw2Sv04Mrf0natgATblFdXfO3g9HqdhOx6uX3bybaqrfm7oefBLlMvpCw2/tn8OW+f1+2/gl/0JGW7sUzQmgdB04t89/1O/w1cDnyilFU="
};
const OPENWEATHER_API = "https://api.openweathermap.org/data/2.5/weather/";

function broadcastSETIndex(req, res) {
  var x = setInterval(function () {
    const date = new Date();
    const hourDateTime = date.getHours()
    if (hourDateTime > 8 || hourDateTime < 19) {
      console.log("11111")
      pushSETIndex(req, res, true)
      console.log("22222")
    }
    console.log("333333")
  }, 1800000)
}

function pushSETIndex(req, res, isBroadcast) {
  var options = {
    uri: 'http://thai-stock.tskyonline.com/Set/GetSet',
    json: true
  };

  request.get(options, function (request, response, body) {
    if (req.method === "POST") {
      const setValue = body[0]
      const operator = setValue.changedPrice > 0 ? "+" : "";
      var message = setValue.code + " " + numberWithCommas(setValue.price.toFixed(2)) + " " + operator + setValue.changedPrice.toFixed(2) + " จุด \n" + "(" + operator + setValue.changedPercentage.toFixed(2) + ") Volumn " + numberWithCommas(setValue.volumnBaht.toFixed(2)) + " ล้านบาท"
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
      var message = stockValue.code.toUpperCase() + " " + numberWithCommas(stockValue.price.toFixed(2)) + " " + operator + stockValue.changedPrice.toFixed(2) + " จุด \n" + "(" + operator + stockValue.changedPercentage.toFixed(2) + ") Volumn " + numberWithCommas(stockValue.volumnBaht.toFixed(2)) + " บาท"
      pushMessage(req, message)
    }
  })
}


exports.LineBotReply = functions.https.onRequest((req, res) => {
  var reqMessage = req.body.events[0].message.text

  if (reqMessage === 'show auto set') {
    pushMessage(req, 'Automated show SET Index is working')
    broadcastSETIndex(req, res)
  } else if (reqMessage === 'set') {
    console.log('choice SET')
    pushSETIndex(req, res, false)
  } else if (reqMessage.startsWith('set')) {
    console.log('choice Stock')
    const stockCode = reqMessage.split(" ")[1];

    pushSETStock(req, res, stockCode)
  } else {
    pushMessage(req, 'Hi ' + reqMessage)
  }
  return res.status(200).send(req.method);
});

const pushMessage = (req, message) => {
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

exports.LineBotBroadcast = functions.region(REGION).runWith(runtimeOpts).https.onRequest((req, res) => {
  const text = req.query.text;
  if (text !== undefined && text.trim() !== "") {
    return broadcast(res, text);
  } else {
    const ret = { message: "Text not found" };
    return res.status(400).send(ret);
  }
});

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
  await request.post({
    uri: `${LINE_MESSAGING_API}/broadcast`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      messages: [{ type: "text", text: msg }]
    })
  });
  return res.status(200).send({ message: `Broadcast: ${msg}` });
};

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}