import { Server } from "socket.io";
import axios from "axios";

const TraceUserCall = async (username1, username2, callDuration) => {
  try {
   
    await axios.post(`${process.env.API_URL}/api/call/add-call`, {
      username1,
      username2,
      timeDuration: callDuration,
    });
  } catch (err) {
    console.error("Error in TraceUserCall:", err.message);
  }
};

const socketHandler = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
  });

  let waiting_queue = [];
  let active_sessions = [];
  let messages = {};
  let skipped_sessions = {};
  let active_sessions_users = {};
  let socket_rooms = {};
  let timeOutRef = {};

  // cron.schedule("* * * * * *", () => {
  //   addActiveCalls(active_sessions_users);
  // });

  const getCurrentUserFunction = () => {
    return active_sessions_users;
  };

  io.on("connection", (socket) => {
    const user_token = socket.id;
    socket.emit("getWaitingRooms", { waiting_queue, active_sessions_users });

    //store_peer_ip
    socket.on("store_peer_ip", ({ roomName, username }) => {
     
      if (active_sessions_users[roomName]) {
        const userIndex = active_sessions_users[roomName].indexOf(socket.id);
        if (userIndex !== -1) {
          active_sessions_users[roomName][userIndex] = {
            id: socket.id,
            username: username,
          };
        }
      }
    });

    // Triggered when a peer hits the join room button
    socket.on("join", ({ roomId: roomName, userskip = false }) => {
      if (!roomName) return;
      const room = io.sockets.adapter.rooms.get(roomName);
      socket_rooms[user_token] = roomName;

      // Create a new room if no such room exists
      if (room === undefined || userskip) {
        // console.log("room does not exist", roomName, waiting_queue);
        socket.join(roomName);
        socket.emit("created");
        messages[roomName] = [];
        if (!waiting_queue.includes(roomName) && roomName) {
          // console.log("pushing room to waiting queue", roomName);
          waiting_queue.push(roomName);
        }
        active_sessions_users[roomName] = [user_token];
        updateRoomState();
      }
      // If there is only one person in the room
      else if (room.size === 1) {
        // console.log("room size is 1", roomName);
        socket.join(roomName);
        socket.emit("joined");
        waiting_queue = waiting_queue.filter((room) => room !== roomName);
        active_sessions.push(roomName);
        if (!active_sessions_users[roomName]?.includes(user_token)) {
          active_sessions_users[roomName]?.push(user_token);
        }
        updateRoomState();
      }
      // Room is full
      else {
        socket.emit("full");
      }
    });

    // Triggered when the person who joined the room is ready to communicate
    socket.on("ready", (roomName) => {
      socket.broadcast.to(roomName).emit("ready");
    });

    // Triggered when server gets an icecandidate from a peer in the room
    socket.on("ice-candidate", (candidate, roomName) => {
      socket.broadcast.to(roomName).emit("ice-candidate", candidate);
    });

    // Triggered when server gets an offer from a peer in the room
    socket.on("offer", (offer, roomName) => {
      socket.broadcast.to(roomName).emit("offer", offer);
    });

    // Triggered when server gets an answer from a peer in the room
    socket.on("answer", (answer, roomName) => {
      // console.log("answer coming....");
      socket.broadcast.to(roomName).emit("answer", answer);
    });

    // Handles user leaving the room and adds the room to the waiting queue
    socket.on("onLeave", (roomName) => {
      if (!roomName) {
        roomName = socket_rooms[user_token];
      }
      // console.log("onLeave", roomName);
      socket.leave(roomName);
      active_sessions = active_sessions.filter((room) => room !== roomName);
      messages[roomName] = [];
      active_sessions_users[roomName] = active_sessions_users[roomName]?.filter(
        (user) => user !== user_token
      );

      // Only add the room back to waiting queue if it's empty
      if (active_sessions_users[roomName]?.length === 0) {
        delete active_sessions_users[roomName];
        waiting_queue = waiting_queue.filter((r) => r != roomName);
      } else {
        if (!waiting_queue.includes(roomName) && roomName)
          waiting_queue.push(roomName);
      }

      updateRoomState();
      socket.emit("getWaitingRooms", { waiting_queue, active_sessions_users });
      socket.broadcast.to(roomName).emit("leave");
    });

    // Handles when a user skips the room
    socket.on("skip", async ({ roomName, username, callDuration }) => {
      if (active_sessions_users[roomName] !== undefined) {
        const [user2] = active_sessions_users[roomName];

        await TraceUserCall(
          username,
          user2?.username || "Unknown",
          callDuration
        );
      }
      active_sessions = active_sessions.filter((room) => room !== roomName);
      messages[roomName] = [];

      io.to(roomName).emit("clear_messages");

      if (!skipped_sessions[user_token]) {
        skipped_sessions[user_token] = [roomName];
      } else {
        skipped_sessions[user_token].push(roomName);
      }

      socket.emit("skipped_users", skipped_sessions[user_token]);
      socket.to(roomName).emit("skipped_users", skipped_sessions[user_token]);

      if (active_sessions_users[roomName]) {
        active_sessions_users[roomName] = active_sessions_users[
          roomName
        ]?.filter((user) => user !== user_token);
      }

      updateRoomState();
      socket.leave(roomName);
    });

    //message send
    socket.on("message_send", (data) => {
      // console.log("message_send", data, Array.isArray(messages[data.roomName]));
      if (!Array.isArray(messages[data.roomName])) messages[data.roomName] = [];
      // console.log("sender", socket.id, messages);
      messages[data.roomName].push({
        sender: socket.id,
        message: data.message,
      });

      socket.broadcast
        .to(data.roomName)
        .emit("message_recieved", messages[data.roomName]);
    });

    socket.on("leave_on", (roomname) => {
      // console.log(
      //   "active_sessions_users",
      //   Object.keys(active_sessions_users).length
      // );
      if (Object.keys(active_sessions_users).length === 0) {
        waiting_queue = [];
      }
      updateRoomState();
      // socket.emit("getWaitingRooms", { waiting_queue, active_sessions_users });
    });

    socket.on("remove_waiting_users", () => {
      const newArray = Object.keys(active_sessions_users);
      waiting_queue = waiting_queue.filter((id) => newArray.includes(id));
    });

    // socket.on("end_call", (roomName) => {
    //   io.to(roomName).emit("clear_messages");
    //   updateRoomState();

    // });

    //onEnd Call
    socket.on("end_call", async ({ roomName, username, callDuration }) => {
      if (active_sessions_users[roomName]?.length === 2) {
        if (active_sessions_users[roomName] !== undefined) {
          const [user1, user2] = active_sessions_users[roomName];

          let userdata2;
          if (user1?.username === username) {
            userdata2 = user2?.username;
          } else {
            userdata2 = user1?.username;
          }

          await TraceUserCall(username, userdata2 || "Unknown", callDuration);
        }
      }
      io.to(roomName).emit("clear_messages");
      updateRoomState();
    });

    socket.on("disconnect", () => {
      const roomName = socket_rooms[user_token];
      // console.log("disconnect", socket.id);
      if (!roomName) return;
      socket.leave(roomName);
      active_sessions = active_sessions.filter((room) => room !== roomName);
      messages[roomName] = [];
      active_sessions_users[roomName] = active_sessions_users[roomName]?.filter(
        (user) => user !== user_token
      );

      // Only add the room back to waiting queue if it's empty
      if (active_sessions_users[roomName]?.length === 0) {
        delete active_sessions_users[roomName];
        waiting_queue = waiting_queue.filter((r) => r != roomName);
      } else {
        if (!waiting_queue.includes(roomName) && roomName)
          waiting_queue.push(roomName);
      }

      updateRoomState();
      socket.emit("getWaitingRooms", { waiting_queue, active_sessions_users });
      if (timeOutRef[roomName]) {
        clearTimeout(timeOutRef[roomName]);
      }
      socket
        .to(roomName)
        .emit("leave", { waiting_queue, active_sessions_users, roomName });
    });

    // Helper function to update room state
    function updateRoomState() {
      io.emit("getWaitingRooms", { waiting_queue, active_sessions_users });
    }
  });
  return getCurrentUserFunction;
};

export default socketHandler;
