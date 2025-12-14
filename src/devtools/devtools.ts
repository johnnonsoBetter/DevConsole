// DevTools panel registration script
// This script runs when DevTools opens and registers our custom panel

chrome.devtools.panels.create(
  "DevConsole", // Panel title
  "public/icons/icon48.png",
  "src/devtools/index.html", // Panel HTML file
  (panel) => {
    console.log("DevConsole panel created");

    // Panel event listeners
    panel.onShown.addListener(() => {
      console.log("DevConsole panel shown");
    });

    panel.onHidden.addListener(() => {
      console.log("DevConsole panel hidden");
    });
  }
);

export {};
