import { continueRender, delayRender } from "remotion";

const LINKS = [
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=block",
  "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=block",
];

if (typeof document !== "undefined") {
  const handle = delayRender("fontlar yükleniyor");
  for (const href of LINKS) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  (async () => {
    await Promise.all([
      document.fonts.load("800 100px 'Bricolage Grotesque'"),
      document.fonts.load("500 100px Satoshi"),
      document.fonts.load("700 100px Satoshi"),
    ]);
    await document.fonts.ready;
    continueRender(handle);
  })();
}
