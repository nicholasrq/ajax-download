const express = require('express'),
      http    = require('http'),
      fs      = require('fs'),
      fileUpload = require('express-fileupload');


const server  = http.createServer(),
      app     = express();

app.use(fileUpload())

app.use('/', express.static(__dirname + '/public'))

app.use('/files', express.static(__dirname + '/upload'))

app.get('/list', function(req, res){
  fs.readdir(`${__dirname}/upload`, function(err, files){
    res.status(200).send(files.map(file => {
      const filePath = `${__dirname}/upload/${file}`,
            stat      = fs.statSync(filePath);

      return { name: file, path: `/files/${file}` }
    }))
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
        res.status(200).send({error: null, success: true, file: `/files/${file.name}`})
      }
    })
  }
})

server.on('request', app);
server.listen(3000, function(){
  console.log('Example app listening on port 3000')
})
