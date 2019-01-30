
const express = require('express')
const bodyParser = require('body-parser')
const util = require('util')
const app = express()
const rp = require('request-promise')
const request = require('request')
const fs = require('fs')
const sprintf = require('sprintf-js').sprintf


const accessToken = 'ERxfigZXQqCeQWfiufODGZQn0XWbFf/lzAoHGHfUdI/5WJx51bIGq19AUCoefELDFRWfX82ssyUp+KYKfq+/6/JxMerB/tfmZBItylfmnigb62nGtL4nLSfKjLWPnsjPX/zAxgWK+b1BvBLj9rYf1AdB04t89/1O/w1cDnyilFU='


//google cloud storage
const Storage = require('@google-cloud/storage');
const config = require('./config');
const CLOUD_BUCKET = config.get('CLOUD_BUCKET');

const storage = Storage({
  projectId: config.get('GCLOUD_PROJECT')
});
const bucket = storage.bucket(CLOUD_BUCKET);
//

var amqp = require('amqplib/callback_api');

function sendUploadToGCS (req, res, next) {
  if (!req.file) {
    return next();
  }

  const gcsname = Date.now() + req.file.originalname;
  const file = bucket.file(gcsname);

  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype
    }
  });

  stream.on('error', (err) => {
    console.log(error);
  });

  stream.on('finish', () => {
    req.file.cloudStorageObject = gcsname;
    file.makePublic().then(() => {
      req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);
      next();
    });
  });

  stream.end(req.file.buffer);
}

function saveContent(messageID, filename,accessToken) {
    let options = {
        method: 'GET',
        uri: 'https://api.line.me/v2/bot/message/'+messageID+'/content',
        headers: {
          'Authorization': 'Bearer '+accessToken
        }
      }

    console.log('download begin:' + filename)
    request(options).pipe(fs.createWriteStream('/tmp/'+filename)).on('finish', () => {
      console.log('download finish:' + filename)
    })
}

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded


app.post('/webhook', (req,resp) => {
    console.log('webhook triggered: post /')
    console.log('params:'+util.inspect(req.params))
    console.log('headers:'+util.inspect(req.headers))
    console.log('body:'+util.inspect(req.body,{depth:null}))
    resp.sendStatus(200);

    var message = req.body.events[0].message
    if (message.type == 'video') {
        console.log('video: id='+message.id)
        var now = new Date()
        var timestamp = Number(req.body.events[0].timestamp)
        var str = sprintf("%04d%02d%02d-%d.mp4",now.getFullYear(),now.getMonth()+1,now.getDate(),now.getTime() - timestamp);
        console.log('will use filename:'+str)
        saveContent(message.id,str,accessToken)
    }
    if ((req.body.events[0].type == 'message') &&
        (req.body.events[0].message.type == 'text')) {
          msg_handler_text(req.body.events[0].message.text,req.body.events[0]);
    }

    if ((req.body.events[0].type == 'message') &&
        (req.body.events[0].message.type == 'image')) {
        console.log('image: id='+req.body.events[0].message.id)
    }

    if ((req.body.events[0].type == 'message') &&
        (req.body.events[0].message.type == 'file')) {
        console.log('file: id='+req.body.events[0].message.id+',fileName='+req.body.events[0].message.fileName)
        saveContent(req.body.events[0].message.id,req.body.events[0].message.fileName,accessToken)
    }
})

function line_reply(replyToken,text) {
  return rp({
    uri : 'https://api.line.me/v2/bot/message/reply',
    method : 'POST',
    headers: {
      'Content-Type' : 'application/json',
      'Authorization' : 'Bearer '+accessToken
    },
    body : {
      replyToken : replyToken,
      messages : [{type: 'text' , text : text}]
    },
    json : true
  });
}

function bitly_shorten(url_long) {
  return rp({
    uri : 'https://api-ssl.bitly.com/v4/shorten',
    method : 'POST',
    headers : {
      'Authorization' : 'Bearer e745bd6e149b4dbf00a7b70ad15436c2cfda9893'
    },
    json : true,
    body : {
      group_guid : 'Bj1ud03EG05',
      long_url : url_long
    }
  }); 
}

async function msg_handler_text(text,event) {
  console.log('text:'+text);
  if (text.startsWith('http')) {
    let bitly_response = await bitly_shorten(text);
    console.log('bitly:'+util.inspect(bitly_response));
    let line_reply_result = await line_reply(event.replyToken,bitly_response.link);
    return;
  }
  line_reply(event.replyToken,'huh?');
}
var listFiles = []

app.get('/api/list',(req,res) => {
    res.json(listFiles)
})

var server = app.listen(process.env.PORT || 3000, function() {
    var port = server.address().port;
    console.log("My Line bot App running on port", port);
});

//saveContent('4321','aloha.jpg','faketoken')

