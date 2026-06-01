import { app, Menu, nativeImage, Tray } from "electron";

const createTrayImage = () => {
  const svg = `
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="12" height="10" rx="2" fill="white"/>
      <circle cx="6" cy="8" r="1.2" fill="black"/>
      <circle cx="9" cy="8" r="1.2" fill="black"/>
      <circle cx="12" cy="8" r="1.2" fill="black"/>
    </svg>
  `;
  const image = nativeImage.createFromBuffer(Buffer.from(svg));

  image.setTemplateImage(true);
  return image;
};

export const createTray = (toggleWindow: () => void, refresh: () => void) => {
  const tray = new Tray(createTrayImage());
  const menu = Menu.buildFromTemplate([
    { label: "Refresh", click: refresh },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setToolTip("AI Workstreams");
  tray.setContextMenu(menu);
  tray.on("click", toggleWindow);

  return tray;
};
