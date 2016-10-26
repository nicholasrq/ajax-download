const guid = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

const formatBytes = function(bytes, decimals) {
   if(bytes == 0) return '0 Byte';
   var k = 1000; // or 1024 for binary
   var dm = decimals + 1 || 3;
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
   var i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const updateList = function(files){
  const fragment = document.createDocumentFragment()

  for(let file of files){
    const li          = document.createElement('li'),
          a           = document.createElement('a'),
          progress    = document.createElement('progress');

    a.textContent = file.name
    a.href        = file.path
    a.download    = file.name

    progress.min    = 0
    progress.max    = 100
    progress.value  = 0
    progress.hidden = true

    li.appendChild(a)
    li.appendChild(document.createTextNode(` ${formatBytes(file.size)}`))
    li.appendChild(progress)
    fragment.appendChild(li)
  }

  list.innerHTML = ""
  list.appendChild(fragment)
}

const getFilesList = function(){
  const xhr = new XMLHttpRequest

  xhr.open('GET', '/list')

  xhr.onload = function(){

    const response = JSON.parse(xhr.responseText)

    updateList(response)
  }

  xhr.send()
}

const renderProgress = function(sessionID, ss){
  for(let ssid in ss){
    if(ssid == sessionID) continue;

    const progress  = sessions.get(ssid),
          session   = ss[ssid]

    if(progress){
      progress.value = session.progress

      if(session.complete){
        progress.parentNode.remove()
        sessions.delete(ssid)
      }
    } else {
      const progressElement = document.createElement('progress'),
            fileName        = document.createTextNode(''),
            wrapper         = document.createElement('li');

      progressElement.min   = 0
      progressElement.max   = 100
      progressElement.value = session.progress

      fileName.textContent = `${session.file} ${formatBytes(session.size)}`
      
      wrapper.appendChild(fileName)
      wrapper.appendChild(progressElement)
      progressFiles.appendChild(wrapper)
      sessions.set(ssid, progressElement)
    }
  }
}

// Upload
const form            = document.querySelector('#upload'),
      list            = document.querySelector('#files-list'),
      progressFiles   = document.querySelector('#progress'),
      progressList    = document.querySelector('#progress-list');

const ws        = new WebSocket(`ws://${location.host}`),
      sessions  = new Map,
      sessionID = guid();

form.addEventListener('submit', function(e){
  e.preventDefault()
  e.stopPropagation()
  const button    = form.querySelector('button'),
        progress  = form.querySelector('progress');

  // блокируем кнопку на время выполнения запроса
  button.disabled = true
  progress.hidden = false

  const data      = new FormData(e.target),
        xhr       = new XMLHttpRequest,
        file      = form.querySelector('input[type=file]').files[0];

  xhr.open('POST', '/upload')

  xhr.upload.onprogress = function(e){
    const percentage = e.loaded / e.total * 100
    progress.value = percentage

    ws.send(JSON.stringify({
      sessionID   : sessionID,
      progress    : percentage,
      file        : file.name,
      size        : file.size,
      complete    : false
    }))
  }

  xhr.onload = function(){
    progress.hidden = true
    button.disabled = false
    ws.send(JSON.stringify({
      sessionID   : sessionID,
      progress    : 100,
      file        : file.name,
      size        : file.size,
      complete    : true
    }))
    form.reset()
  }

  xhr.send(data)
})

list.addEventListener('click', function(e){
  if(e.target.nodeName === 'A'){
    e.preventDefault()
    e.stopPropagation()

    const {
      href,
      download: fileName
    } = e.target

    const xhr       = new XMLHttpRequest,
          progress  = e.target.parentNode.querySelector('progress');

    progress.hidden = false

    xhr.responseType = 'blob'
  
    xhr.open("GET", href)

    xhr.onprogress = function(e){
      const percentage = e.loaded / e.total * 100
      progress.value = Math.ceil(percentage)
    }

    xhr.onload = function(e){
      if(xhr.status === 200){
        const blob = new Blob([xhr.response])
        const link = document.createElement('a')

        link.href         = URL.createObjectURL(blob)
        link.textContent  = fileName
        link.download     = fileName

        link.click()

        progress.hidden = true
        progress.value  = 0
      }
    }

    xhr.send()

  }
}, true)

ws.addEventListener('message', e => {
  const response = JSON.parse(e.data)
  if(response.sessions){
    const ss = Object.keys(response.sessions).map(k => response.sessions[k])
    renderProgress(sessionID, response.sessions)

    if(ss.filter(s => s.complete === false).length > 0){
      progressList.hidden = false
    } else {
      progressList.hidden = true
    }
  } else if(response.connections){
    document.querySelector('#connections').textContent = `${response.connections} active connections`
  } else {
    updateList(response)
  }
})

ws.addEventListener('close', e => {
  console.log('Connection closed')
})

window.onbeforeunload = () => { ws.close() }

getFilesList()
