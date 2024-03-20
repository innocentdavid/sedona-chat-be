// src/index.js
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || ""
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
  
const CHAT_BOT = "ChatBot";
let chatRoom = ""; // E.g. javascript, node,...
let allUsers: any[] = []; // All users in current chat room

io.on("connection", (socket) => {
console.log(`User connected`);

let __createdtime__ = Date.now(); // Current timestamp

socket.on("join_room", (data) => {
    let chatRoomUsers = [{ username: "", room: "" }];
    const { username, user_id, avatar, room } = data; // Data sent from client when join_room event emitted
    chatRoom = room;
    if (
    !allUsers.find((user) => {
        return user.username === username && user.room === room;
    })
    ) {
    allUsers.push({ username, user_id, avatar, room });
    chatRoomUsers = allUsers.filter((user) => user.room === room);
    console.log("user joined room");
    } else {
    console.log("user already joined");
    }
    socket.join(room); // Join the user to a socket room
    socket.to(room).emit("chatroom_users", allUsers);
    socket.emit("chatroom_users", allUsers);

    // Send message to all users currently in the room, apart from the user that just joined
    // socket.to(room).emit("receive_message", {
    //   message: `${username} has joined the chat room`,
    //   username: CHAT_BOT,
    //   __createdtime__,
    // });

    // socket.emit("receive_message", {
    //   message: `Welcome ${username}`,
    //   username: CHAT_BOT,
    //   __createdtime__,
    // });
});

socket.on("send_message", async (data) => {
    const { room, user_id, message } = data;
    console.log("sdkl1");
    io.in(room).emit("receive_message", data);
    console.log("sdskfsd");
    const { error } = await supabase.from("chats").insert({
    user_id,
    message,
    room,
    });
    error && console.log("failed to save message due to: ", error.message);
});
});

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

server.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});