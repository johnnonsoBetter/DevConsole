// DevTools panel registration script
// This script runs when DevTools opens and registers our custom panel

chrome.devtools.panels.create(
  'DevConsole', // Panel title
  '', // Icon path (empty for now)
  'src/devtools/index.html', // Panel HTML file
  (panel) => {
    console.log('DevConsole panel created');
    
    // Panel event listeners
    panel.onShown.addListener(() => {
      console.log('DevConsole panel shown');
    });
    
    panel.onHidden.addListener(() => {
      console.log('DevConsole panel hidden');
    });
  }
);

export {};