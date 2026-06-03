import assert from "node:assert";
import { app, Menu, nativeImage, Tray } from "electron";

const iconSize = 18;
const iconDots = [
  { x: 6, y: 8 },
  { x: 9, y: 8 },
  { x: 12, y: 8 },
];

const isInsideDot = (x: number, y: number, dot: (typeof iconDots)[number]) =>
  (x - dot.x) ** 2 + (y - dot.y) ** 2 <= 1.2 ** 2;

const isInsideRoundedRect = (x: number, y: number) => {
  const bounds = { left: 3, top: 4, right: 15, bottom: 14, radius: 2 };
  const nearestX =
    x < bounds.left + bounds.radius
      ? bounds.left + bounds.radius
      : x > bounds.right - bounds.radius
        ? bounds.right - bounds.radius
        : x;
  const nearestY =
    y < bounds.top + bounds.radius
      ? bounds.top + bounds.radius
      : y > bounds.bottom - bounds.radius
        ? bounds.bottom - bounds.radius
        : y;

  return (
    x >= bounds.left &&
    x < bounds.right &&
    y >= bounds.top &&
    y < bounds.bottom &&
    (x - nearestX) ** 2 + (y - nearestY) ** 2 <= bounds.radius ** 2
  );
};

const createTrayBitmap = () => {
  const buffer = Buffer.alloc(iconSize * iconSize * 4);

  for (let y = 0; y < iconSize; y += 1) {
    for (let x = 0; x < iconSize; x += 1) {
      const center = { x: x + 0.5, y: y + 0.5 };
      const offset = (y * iconSize + x) * 4;
      const alpha =
        isInsideRoundedRect(center.x, center.y) &&
        !iconDots.some((dot) => isInsideDot(center.x, center.y, dot))
          ? 255
          : 0;

      buffer[offset] = 0;
      buffer[offset + 1] = 0;
      buffer[offset + 2] = 0;
      buffer[offset + 3] = alpha;
    }
  }

  return buffer;
};

const createTrayImage = () => {
  const image = nativeImage.createFromBitmap(createTrayBitmap(), {
    width: iconSize,
    height: iconSize,
  });

  assert(!image.isEmpty(), "Tray icon image could not be created.");
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
