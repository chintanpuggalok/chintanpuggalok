// Wrangler imports workerd even for cloud-only commands. Cloudflare does not
// publish a workerd binary for Android/Termux, so provide metadata only.
// This allows authentication, secret, and deployment commands to run. It does
// not make local `wrangler dev` available on Android.
const Module = require("node:module");
const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "workerd") {
    return {
      default: "workerd-unavailable-on-android",
      compatibilityDate: "2026-09-03",
      version: "1.20260903.1",
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};
