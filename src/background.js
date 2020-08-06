'use strict'

import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import axios from 'axios'
import cheerio from 'cheerio'
// const fs = require('fs');
const isDevelopment = process.env.NODE_ENV !== 'production'
const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

let count

ipcMain.on('getPort', (e, key, msg) => {
  console.log('e, key, msg: ', e, key, msg);
  axios({
    method: 'get',
    url: `http://www.cma-cgm.com/api/PortsWithInlands/GetAll?id=${msg}&manageChineseRegions=true`
  }).then(res => {
    console.log('res: ', res.data)
    e.sender.send('setPort', key, res.data)
  })
})

console.log('ipcMain: ', Object.keys(ipcMain));

ipcMain.on('queryURL', (e, url) => {
  console.log('url: ', url);
  e.sender.send('setVoyage', [])
  axios({
    method: 'get',
    url,
  }).then(res => {
    const $ = cheerio.load(res.data)
    const table = $('.solutions-table a');
    const voyage = []
    table.each((index, ele) => {
      const href = ele.attribs.href
      if (href.includes('ebusiness/schedules/voyage/detail')) {
        console.log(index, href);
        voyage.push('http://www.cma-cgm.com/' + href)
      }
    })
    e.sender.send('setPort', 'voyage', voyage)
    count = voyage.length
    for (let index = 0; index < voyage.length; index++) {
      findNext(voyage[index], e)
    }
  })
})

function findNext (url, e) {
  axios({
    method: 'get',
    url
  }).then(res => {
    const $ = cheerio.load(res.data)
    const moda = $('.mod a')
    const modp = $('.mod p')
    if (!moda.length && !modp.length) {
      count--
      if (count == 0) {
        console.log('done')
        e.sender.send('setPort', 'done')
      }
      return
    }
    let vessel = ''
    let next  = ''
    modp.each((index, ele) => {
      const text = $(ele).text().trim()
      if (text.includes('Vessel')) {
        vessel = text.replace('Vessel', '').trim()
      }
    })
    moda.each((index, ele) => {
      const href = $(ele).attr('href')
      if (href.includes('searchMode=NextVessel')) {
        next = href
      }
    })
    // console.log('vessel: ', vessel);
    const row = {
      vessel
    }
    const tbody = $('tbody tr')
      tbody.each((index, ele) => {
      const td = $(ele).find('td')
      td.each((index, el) => {
        const obj = {
          0: 'Port',
          1: 'Arrival',
          2: 'Sail',
          3: 'Terminal',
          4: 'VGM Cut-off',
          5: 'Port Cutof'
        }
        row[obj[index]] = $(el).text().trim()
      })
    })
    console.log('row: ', JSON.stringify(row));
    e.sender.send('setPort', 'addRow', row)
    // console.log('next: ', next);
    findNext('http://www.cma-cgm.com/' + next, e)
  })

}


function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: true, // process.env.ELECTRON_NODE_INTEGRATION,
      // preload: path.join(__dirname, './renderer.js'),
      preload: path.resolve(__dirname, './renderer.js'),
      webSecurity: false,
      sandbox: true,
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
    // win.webContents.openDevTools();
  }

  win.on('closed', () => {
    win = null
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
