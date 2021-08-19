import { io } from "socket.io-client";

const URL = "https://localhost:12345/chat";
const socket = io(URL, { 
  autoConnect: true,
  secure : true,
});

socket.onAny((event, ...args) => {
  console.log(event, args);
});

export default socket;
