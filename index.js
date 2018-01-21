
const express = require('express')
const bodyParser = require('body-parser')
const util = require('util')
const app = express()
const rp = require('request-promise')
const request = require('request')
const fs = require('fs')
const sprintf = require('sprintf-js').sprintf


const accessToken = 'ERxfigZXQqCeQWfiufODGZQn0XWbFf/lzAoHGHfUdI/5WJx51bIGq19AUCoefELDFRWfX82ssyUp+KYKfq+/6/JxMerB/tfmZBItylfmnigb62nGtL4nLSfKjLWPnsjPX/zAxgWK+b1BvBLj9rYf1AdB04t89/1O/w1cDnyilFU='

function saveContent(messageID, filename,accessToken) {
    let options = {
        method: 'GET',
        uri: 'https://api.line.me/v2/bot/message/'+messageID+'/content',
        headers: {
          'Authorization': 'Bearer '+accessToken
        }
      }
    request(options).pipe(fs.createWriteStream('/tmp/'+filename))
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
        console.log('text:'+req.body.events[0].message.text)
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

var listFiles = []

app.get('/api/list',(req,res) => {
    res.json(listFiles)
})

var server = app.listen(process.env.PORT || 8080, function() {
    var port = server.address().port;
    console.log("My Line bot App running on port", port);
});

fs.readdir('./', function(err, items) {
    console.log(items);
    for (var i=0;i<items.length;i++) {
        console.log(items[i])
        if (items[i].endsWith('mp4')) {
            listFiles.push(items[i])
            console.log('pushed to array:')
            console.log(listFiles)
        }
    }
});

//saveContent('4321','aloha.jpg','faketoken')

