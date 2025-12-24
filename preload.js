const { contextBridge, ipcRenderer } = require('electron');

// Log
console.log('Preload script loading...');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => {
    console.log('Minimize called from renderer');
    ipcRenderer.send('minimize');
  },
  close: () => {
    console.log('Close called from renderer');
    ipcRenderer.send('close');
  },
  openSettings: () => {
    console.log('Open settings called');
    ipcRenderer.send('open-settings');
  },
  updatePassword: (newPass) => {
    console.log('Updating password');
    ipcRenderer.send('update-password', newPass);
  },
  updateImage: (imagePath) => {
    console.log('Updating image');
    ipcRenderer.send('update-image', imagePath);
  },
  updateUsername: (newUsername) => {
    console.log('Updating username');
    ipcRenderer.send('update-username', newUsername);
  },
  updateImage: (imageData) => {
    console.log('Updating image with base64 data');
    ipcRenderer.send('update-image', imageData);
  },
});

console.log('Preload script loaded, electronAPI exposed');
