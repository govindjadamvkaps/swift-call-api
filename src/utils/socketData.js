import socketHandler from "./socket.js";

let getCurrentUserFunction;

export function initializeSocket(server) {
  getCurrentUserFunction = socketHandler(server);
}

export function getActiveSessions() {
  return getCurrentUserFunction();
}
