//ribbon separata cause it's fucking annoying
const ribbonHTML = `
<div class="wibbon">
  <span>Kalam Client</span>
  <div class="wibbon-controls">
    <button id="ribbon-settings">⚙</button>
    <button id="ribbon-minimize">–</button>
    <button id="ribbon-close">✕</button>
  </div>
</div>
<style>
  .wibbon {
  all: initial !important;
  box-sizing: border-box !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 40px !important;
  background: #1a1a1a !important;
  color: #ffffff !important;
  font-family: 'Poppins', sans-serif !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 15px !important;
  z-index: 2147483647 !important;
  -webkit-app-region: drag !important;
  box-shadow: 0 2px 10px rgba(0,0,0,0.4) !important;
  border-bottom: 1px solid #333333 !important;
}

  .wibbon span {
    font-weight: 500 !important;
    font-size: 14px !important;
    letter-spacing: 0.5px !important;
    color: #f0f0f0 !important;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
  }
  
  .wibbon-controls {
    display: flex !important;
    gap: 8px !important;
  }
  
  .wibbon button {
    all: initial !important;
    -webkit-app-region: no-drag !important;
    background: #2d2d2d !important;
    border: 1px solid #404040 !important;
    color: #cccccc !important;
    padding: 5px 15px !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    font-family: 'Poppins', sans-serif !important;
    font-size: 14px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.2s ease !important;
  }
  
  .wibbon button:hover {
    background: #3a3a3a !important;
    border-color: #505050 !important;
    color: #ffffff !important;
  }
  
  .wibbon button:active {
    background: #252525 !important;
    transform: translateY(1px) !important;
  }
  
  /* Window control buttons specific styling */
  #ribbon-minimize {
    background: #2d2d2d !important;
  }
  
  #ribbon-close {
    background: #2d2d2d !important;
  }
  
  #ribbon-minimize:hover {
    background: #912fd3 !important;
    border-color: #912fd3 !important;
    color: white !important;
  }
  
  #ribbon-close:hover {
    background: #d32f2f !important;
    border-color: #d32f2f !important;
    color: white !important;
  }
  
  #ribbon-settings:hover {
    background: #3a76f0 !important;
    border-color: #3a76f0 !important;
    color: white !important;
  }
  
  #page-header,
  .navbar,
  .fixed-top {
      top: 40px !important;
  }

</style>
`;

function injectPersistentRibbon(mainWindow) {
  const injectCode = `
    (function () {
      if (document.querySelector('.wibbon')) return;

      document.body.insertAdjacentHTML('afterbegin', \`${ribbonHTML}\`);

      document.getElementById('ribbon-settings')?.addEventListener('click', () => {
        window.electronAPI?.openSettings?.();
      });

      document.getElementById('ribbon-minimize')?.addEventListener('click', () => {
        window.electronAPI?.minimize?.();
      });

      document.getElementById('ribbon-close')?.addEventListener('click', () => {
        window.electronAPI?.close?.();
      });

      console.log('Persistent ribbon injected');
    })();
  `;

  mainWindow.webContents.executeJavaScript(injectCode).catch((err) => {
    console.error('Ribbon injection failed:', err);
  });
}

module.exports = { injectPersistentRibbon };
