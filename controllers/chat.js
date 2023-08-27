const { PrivateRoom, ChatMessage, RoomStatus } = require("../models/chat");
const Request = require("../models/request");

// Create a new private room
exports.createPrivateRoom = async (roomId, clients) => {
  try {
    const roomStatus = new RoomStatus();
    const newPrivateRoom = new PrivateRoom({ roomId, clients, roomStatus });
    const request = Request.findOneAndUpdate(
      { _id: roomId },
      {
        privateRoom: newPrivateRoom,
      },
      { new: true }
    ).exec((err, data) => {
      if (err) {
        console.log("Error");
        console.log(err);
      } else {
        console.log(data);
      }
    });
    const savedPrivateRoom = await newPrivateRoom.save();

    return savedPrivateRoom;
  } catch (err) {
    console.error(`Error creating private room: ${err}`);
  }
};

// Read a private room by its ID
exports.readPrivateRoomById = async (id) => {
  try {
    const privateRoom = await PrivateRoom.findOne({ roomId: id }).populate(
      "clients"
    );
    if (privateRoom) {
      console.log(`Private room ${id} found`);
      return privateRoom;
    } else {
      console.log(`Private room ${id} not found`);
      return null;
    }
  } catch (err) {
    console.error(`Error reading private room: ${err}`);
  }
};

exports.updateRoomStatus = async (roomId, gender, status) => {
  try {
    PrivateRoom.findOne({ roomId }).exec(async (err, data) => {
      if (err) {
        return null;
      } else {
        if (gender === "man") {
          data.roomStatus.manStatus = status;
        } else {
          data.roomStatus.womanStatus = status;
        }
        await data.save();
        return data;
      }
    });
  } catch (err) {
    return null;
  }
};

// Update a private room by its ID
exports.updatePrivateRoomById = async (id, update) => {
  try {
    const updatedPrivateRoom = await PrivateRoom.findOneAndUpdate(
      { roomId: id },
      update,
      {
        new: true,
      }
    )
      .populate("clients")
      .exec((err, data) => {
        if (err) {
          console.error(`Error updating private room: ${err}`);
        } else {
        }
      });
    console.log(`Private room ${id} updated`);
    return updatedPrivateRoom;
  } catch (err) {
    console.error(`Error updating private room: ${err}`);
  }
};

// Update a private room by its ID
exports.AddNewMessagesInRoom = async (
  id,
  senderUserName,
  message,
  responseTo
) => {
  try {
    const newMessage = new ChatMessage({ senderUserName, message, responseTo });
    const updatedPrivateRoom = await PrivateRoom.findOneAndUpdate(
      { roomId: id },
      {
        $push: {
          messages: newMessage,
        },
      },
      {
        new: true,
      }
    )
      .populate("clients")
      .exec((err, data) => {
        if (err) {
          console.error(`Error updating private room: ${err}`);
        } else {
        }
      });
    console.log(`Message ${message} Added to room ${id}`);
    return updatedPrivateRoom;
  } catch (err) {
    console.error(`Error updating private room: ${err}`);
  }
};

// Delete a private room by its ID
exports.deletePrivateRoomById = async (id) => {
  try {
    const deletedPrivateRoom = await PrivateRoom.findByIdAndDelete(id);
    console.log(`Private room ${id} deleted`);
    return deletedPrivateRoom;
  } catch (err) {
    console.error(`Error deleting private room: ${err}`);
  }
};
