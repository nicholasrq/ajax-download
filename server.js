const express         = require('express'),
      http            = require('http'),
      fs              = require('fs'),
      WebSocketServer = require('ws').Server,
      fileUpload      = require('express-fileupload');

const server    = http.createServer(),
      app       = express(),
      wss       = new WebSocketServer({ server }),
      sessions  = {};

wss.broadcast = function broadcast(data) {
  for(let client of wss.clients){
    setTimeout(() => {
      client.send(data);
    })
  }
};

const getFilesList = function(){
  return new Promise(resolve => {
    fs.readdir(`${__dirname}/upload`, function(err, files){
      const filesListData = files.filter(file => {
        return (/^\./.test(file)) === false
      }).map(file => {
        const filePath = `${__dirname}/upload/${file}`,
              stat      = fs.statSync(filePath);
        
        return { name: file, path: `/files/${file}`, size: stat.size }
      })

      resolve(filesListData)
    })
  })
}

app.use(fileUpload())

app.use('/', express.static(__dirname + '/public'))

app.use('/files', express.static(__dirname + '/upload'))

app.get('/list', function(req, res){
  getFilesList().then(response => {
    res.status(200).send(response)
  })
})

app.get('/download', function(req, res){
  res.status(200).send('Hello')
})

app.post('/upload', function(req, res){
  if(!req.files){
    res.status(200).send({error: 'No files provided', success: false})
  } else {
    const file = req.files.file
    file.mv(`${__dirname}/upload/${file.name}`, err => {
      if(err){
        res.status(200).send({error: err, success: false})
      } else {
        const response = {error: null, success: true, file: `/files/${file.name}`}
        res.status(200).send(response)
      }
    })
  }
})

server.on('request', app);

server.listen(3000, function(){
  console.log('Example app listening on port 3000')
})

wss.on('connection', function(ws){
  ws.on('message', message => {
    const data = JSON.parse(message)

    sessions[data.sessionID] = data
    
    for(let cli of wss.clients){
      if(cli === ws) continue

      cli.send(JSON.stringify({
        sessions: sessions
      }))

      if(data.complete){
        sessions[data.sessionID] = null
        delete sessions[data.sessionID]
      }
    }
  })

  ws.on('close', function(){
    wss.broadcast(JSON.stringify({
      connections: wss.clients.length
    }))
  })

  wss.broadcast(JSON.stringify({
    connections: wss.clients.length
  }))
})

fs.watch('./upload', function(){
  getFilesList().then(response => {
    wss.broadcast(JSON.stringify(response))
  })
})
