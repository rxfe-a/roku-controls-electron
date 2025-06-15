const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { discover, Client } = require('roku-client');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('scan-rokus', async () => {
  try {
    const devices = await discover();
    return devices.map(device => ({
      name: device.info?.friendlyName || device.info?.modelName || `Roku Device`,
      ip: device.ip,
      port: device.port || 8060,
      device: device
    }));
  } catch (error) {
    console.error('Discovery error:', error);
    return [];
  }
});

ipcMain.handle('send-roku-command', async (event, ip, command) => {
  try {
    const client = new Client(`http://${ip}:8060`);
    switch (command) {
      case 'PowerOn':
        await client.keypress('Power');
        break;
      case 'Left':
        await client.keypress('Left');
        break;
      case 'Right':
        await client.keypress('Right');
        break;
      default:
        await client.keypress(command);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error sending command:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-roku-info', async (event, ip) => {
  try {
    const client = new Client(`http://${ip}:8060`);
    const info = await client.info();
    
    return {
      success: true,
      name: info.friendlyName || info.modelName || 'Unknown Roku',
      model: info.modelName || 'Unknown Model',
      version: info.softwareVersion || 'Unknown'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});