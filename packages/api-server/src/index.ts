import { getLogger } from "./core";

function launch(opts?: { port?: number; logPath?: string }): Promise<number> {
  const ctx = "launch";
  const listenPort = opts?.port || 0;
  const LOG_DST = opts?.logPath ? opts.logPath : "stdout";
  process.env["LOG_DST"] = LOG_DST;
  const L = getLogger();
  return new Promise((resolve) => {
    const appModule = require("./Server").appModule;
    const app = appModule({ logPath: LOG_DST });
    const server = app.listen(listenPort, () => {
      const port = (server.address() as any).port;
      L.info({ ctx, msg: "exit", port, LOG_DST, lvl: L.level });
      resolve(port);
    });
  });
}
export { appModule } from "./Server";
export { launch };
