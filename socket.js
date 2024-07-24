const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const cors = require('cors')
const server = http.createServer((req,res)=>{
  if (req.url === '/new-path') {
    res.write("hi");
    res.end()
  } 
}).listen(3003, () => {
  console.log("Server is running on port 3003");
});

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const userSocketMap = new Map();

function socketInit() {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("storeUserId", (userId) => {
      userSocketMap.set(userId, socket.id);
      socket.userId = userId;
      console.log(`Stored user ID ${userId} with socket ID ${socket.id}`);
    });

    socket.on("chatMessage", async (msg) => {
      try {
        // console.log("Chat message received:", msg);
        io.emit("chatMessage", msg);
      } catch (error) {
        console.error("Error saving chat message:", error);
      }
    });

    socket.on("privateMessage", async (msg) => {
      try {
        // console.log("Private message received:", msg);
        const { receiverId, senderId, message, timeStamp } = msg;
        const receiverSocketId = userSocketMap.get(receiverId);
        const senderSocketId = userSocketMap.get(senderId);

        console.log(userSocketMap);
        const res = await axios.post("https://feastgram-mhil.onrender.com/api/v1/chats/messages", msg);
        // const res = await axios.post("http://localhost:3000/api/v1/chats/messages", msg);
        // console.log(res);
        const createdPrivateMessage = {
          receiverId: {
            id: receiverId,
          },
          senderId: {
            id: senderId
          },
          message: message,
          timeStamp: timeStamp,
        };

        io.to(senderSocketId).to(receiverSocketId).emit("receivePrivate", createdPrivateMessage);
        
        // io.to(senderSocketId).emit("receivePrivate", msg);
      } catch (error) {
        console.error("Error handling private message:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      userSocketMap.delete(socket.userId);
    });
  });
}

socketInit();
