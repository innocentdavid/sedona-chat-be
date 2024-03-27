// ! remember this
// await supabase

// src/index.js
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
export const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY || ""
);

const app: Express = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  path: "/socket.io",
  cors: {
    // origin: 'https://humble-halibut-4wv5p96jj427pg9-5173.app.github.dev',
    // origin: ['http://127.0.0.1:5173', "https://pebble-betting.vercel.app"],
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket: any) => {
  console.log(`User connected`);

  socket.on("join_room", (data: any) => {
    if (data?.user_id) {
      // Add user data to the room
      socket.roomData = data;
    }
    socket.join(data.room);
    // Update the client's own user list
    data?.room && updateUsersList(data?.room);
  });

  socket.on("send_message", async (data: any) => {
    const { room, user_id, message } = data;
    io.in(room).emit("receive_message", data);
    const { error } = await supabase.from("chats").insert({
      user_id,
      message,
      room,
    });
    error && console.log("failed to save message due to: ", error.message);
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("user disconnected");

    if (socket.roomData) {
      // Update the client's user list after the user leaves
      socket?.roomData?.room && updateUsersList(socket?.roomData?.room);
      // Remove user data from the room
      delete socket.roomData;
    }
  });

  function updateUsersList(room: string) {
    const usersInRoom = io.sockets.adapter.rooms.get(room);
    const usersData = [];

    if (usersInRoom) {
      for (const socketId of usersInRoom) {
        const socket: any = io.sockets.sockets.get(socketId);
        if (socket && socket.roomData) {
          usersData.push(socket.roomData);
        }
      }
    }

    // Emit updated user list to all clients in the room
    // io.to(room).emit("chatroom_users", usersData);

    // Emit updated user list to all connected clients
    io.emit("chatroom_users", usersData);
  }
});

app.get("/", (req: Request, res: Response) => {
  res.send("Hello world!");
});

server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
