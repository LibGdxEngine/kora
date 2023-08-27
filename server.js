const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const Notification = require("./models/Notifications");
require("dotenv").config();

let URL = "";
if (process.env.NODE_ENV === "development") {
  URL = process.env.CLIENT_URL_DEVELOPMENT;
} else {
  URL = process.env.CLIENT_URL_PRODUCTION;
}
//bring routes
const blogRoutes = require("./routes/blog");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const categoryRoutes = require("./routes/category");
const tagRoutes = require("./routes/tag");
const formRoutes = require("./routes/form");
const {
  createPrivateRoom,
  readPrivateRoomById,
  updateRoomStatus,
  updatePrivateRoomById,
  deletePrivateRoomById,
  AddNewMessagesInRoom,
} = require("./controllers/chat");
//app
const app = express();
const http = require("http").Server(app);

const socketIO = require("socket.io")(http, {
  cors: {
    origin: URL,
  },
});

const privateRooms = {};
const userSocketMap = new Map();

// When a new client connects
socketIO.on("connection", (socket) => {
  // When a client wants to join a private room
  socket.on("joinPrivateRoom", async (roomId, joinedUserName) => {

    let room = await readPrivateRoomById(roomId);

    let previousMessages = room ? room.messages : [];
    if (room) {
      const roomClients = room.clients;
      roomClients.push(joinedUserName);
      if (room.clients.length === 2) {
        // Notify the other client that they have a new partner in the room
        const partnerId = room.clients.find(
          (clientId) => clientId !== socket.id
        );
        socketIO.to(partnerId).emit("partnerJoined", roomId);
      }
    } else {
      // Create the room and add the client
      const roomClients = [socket.id];
      room = await createPrivateRoom(roomId, roomClients);
    }
    // Add the client to the room
    socket.join(roomId);
    console.log(`Client ${socket.id} joined private room ${roomId}`);

    // Notify the client that they have successfully joined the room
    socket.emit("privateRoomJoined", roomId, previousMessages);

    // if (room.clients.length >= 2) {
    //   // Notify the clients that the room is full
    //   socketIO.to(roomId).emit("privateRoomFull");
    // }
  });

  // When a client sends a private message
  socket.on(
    "privateMessage",
    async ({ roomId, senderUserName, message, responseTo }) => {
      await AddNewMessagesInRoom(roomId, senderUserName, message, responseTo);
      socket
        .to(roomId)
        .emit("privateMessage", { message, senderUserName, responseTo });
    }
  );

  socket.on("userAcceptance", async ({ roomId, username }) => {
    socket.to(roomId).emit("userAcceptance", { username });
  });

  socket.on("userRejection", async ({ roomId, username, rejectionReason }) => {
    socket.to(roomId).emit("userRejection", { username, rejectionReason });
  });

  socket.on("joinNotificationsRoom", async ({ userId }) => {
    // Store user ID in userSocketMap object
    userSocketMap.set(JSON.stringify(userId), socket);
  });

  // When a client disconnects
  socket.on("disconnect", () => {
    // Remove the user ID from the map when the socket disconnects
    const userId = Array.from(userSocketMap.keys()).find(
      (key) => userSocketMap.get(key) === socket
    );
    if (userId) {
      userSocketMap.delete(userId);
    }

    // Remove the client from any private rooms they were in
    Object.entries(privateRooms).forEach(([roomId, roomClients]) => {
      if (roomClients.includes(socket.id)) {
        socketIO.to(roomId).emit("partnerLeft");
        privateRooms[roomId] = roomClients.filter(
          (clientId) => clientId !== socket.id
        );
      }
    });
  });
});

//db
mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.DATABASE, { useNewUrlParser: true })
  .then(() => console.log("connected"))
  .catch((e) => console.log(e));

//middlewares
app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(cors({ origin: "http://localhost:3000" }));
} else {
  app.use(
    cors({ origin: "https://letaskono-zwaj.com", optionsSuccessStatus: 200 })
  );
}

// Socket.io middleware to share the 'io' instance with other modules
app.use((req, res, next) => {
  req.userSocketMap = userSocketMap;
  req.io = socketIO;
  next();
});
//routes middlewares
app.use("/api", blogRoutes);
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api", categoryRoutes);
app.use("/api", tagRoutes);
app.use("/api", formRoutes);

app.get("/api/notifications/:userId", (req, res) => {
  const userId = req.params.userId;

  // Set up headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Create a MongoDB change stream to listen for new notifications for this user
  const changeStream = Notification.watch({
    fullDocument: "updateLookup",
    pipeline: [
      { $match: { operationType: "insert", "fullDocument.userId": userId } },
    ],
  });
  changeStream.on("change", (change) => {
    const notification = change.fullDocument;
    // res.write(`data: ${notification.message}\n\n`);
  });

  // Send any pending notifications for this user
  Notification.find({ userId, read: false }, (err, notifications) => {
    if (err) {
      console.error(err);
      return res.sendStatus(500);
    }

    notifications.forEach((notification) => {
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
    });
  });
});

app.post("/api/notifications/:userId", (req, res) => {
  const userId = req.params.userId;
  const message = req.body.message;
  const link = req.body.link;
  // Save the notification to the database
  const notification = new Notification({ userId, message, link });
  notification.save((err) => {
    if (err) {
      console.error(err);
      return res.sendStatus(500);
    }
    res.sendStatus(200);
  });
});

app.put("/api/notifications/read", (req, res) => {
  const id = req.body.id;

  const update = { read: true, message: "" };
  Notification.findByIdAndUpdate({ _id: mongoose.Types.ObjectId(id) }, update, {
    new: true,
  }).then((data, err) => {
    if (err) {
      return res.sendStatus(500);
    }

    res.sendStatus(200);
  });
});

const port = process.env.PORT || 8000;

http.timeout = 60000;

http.listen(port, () => console.log(`Listening on port ${port}`));
