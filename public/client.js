// Upload
const form  = document.querySelector('#upload'),
      list  = document.querySelector('#files-list');

const updateList = function(){
  const xhr = new XMLHttpRequest

  xhr.open('GET', '/list')

  xhr.onload = function(){

    const response = JSON.parse(xhr.responseText),
          fragment = document.createDocumentFragment()

    for(let file of response){
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
      li.appendChild(progress)
      fragment.appendChild(li)
    }

    list.innerHTML = ""
    list.appendChild(fragment)
  }

  xhr.send()
}

form.addEventListener('submit', function(e){
  e.preventDefault()
  e.stopPropagation()
  const button    = form.querySelector('button'),
        progress  = form.querySelector('progress');

  // блокируем кнопку на время выполнения запроса
  button.disabled = true
  progress.hidden = false

  const data  = new FormData(e.target),
        xhr   = new XMLHttpRequest;

  xhr.open('POST', '/upload')

  xhr.upload.onprogress = function(e){
    const percentage = e.loaded / e.total * 100
    progress.value = percentage
  }

  xhr.onload = function(){
    progress.hidden = true
    button.disabled = false
    updateList()
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

updateList()
