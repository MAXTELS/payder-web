import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Without this, Turbopack walks up from the project folder looking for a
  // workspace root and can land on a lockfile elsewhere in the user's home
  // directory (e.g. C:\Users\<name>\package-lock.json from an unrelated
  // project/tool). When that happens its dev-server file watcher ends up
  // scoped far too broadly — effectively the whole home directory — so any
  // unrelated filesystem activity there (cloud-sync writes, other tools'
  // background processes, etc.) can trigger spurious Fast Refresh / full
  // page reloads in THIS app. Pinning the root to this project folder fixes
  // that: the watcher only sees files that actually belong to this app.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  // Lets the dev server accept Fast Refresh / HMR connections from a phone
  // or other device on the same network (opening http://<pc-lan-ip>:3001).
  // Without this, Next.js 16 blocks that cross-origin dev-only websocket —
  // pages still load and work, but that device never gets live-reload.
  // Cosmetic (dev-only, doesn't affect API calls or production), but the
  // console warning is otherwise easy to mistake for a real bug. If your
  // PC's LAN IP changes (e.g. after a router restart / DHCP lease renewal),
  // update this to match `ipconfig`'s new IPv4 address.
  allowedDevOrigins: ['10.97.97.101'],
};

export default nextConfig;
