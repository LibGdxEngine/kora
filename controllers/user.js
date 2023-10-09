const User = require("../models/user");
const Blog = require("../models/blog");
const Request = require("../models/request");
const Notification = require("../models/Notifications");
const Report = require("../models/report");
const { PrivateRoom, RoomStatus } = require("../models/chat");
const _ = require("lodash");
const formidable = require("formidable");
const fs = require("fs");
const questions = require("../questions.json");
const jwt = require("jsonwebtoken");
const { errorHandler } = require("../helpers/dbErrorHandler");
const mongoose = require("mongoose");
const { sendEmailWithNodemailer } = require("../helpers/email");
const { createHelpRequest } = require("./chat");
const HelpRequest = require("../models/helpRequest");
const Club = require("../models/Club");
const Stadium = require("../models/Stadium");
const Reservation = require("../models/Reservation");
const ObjectId = mongoose.Types.ObjectId;
const moment = require("moment");

const USER_CONFIRMATION_STATUS = {
  PENDING: 0,
  ACCEPTED: 1,
  REJECTED: 2,
  DEACTIVATED: 3,
  BLOCKED: 4,
};

exports.followClub = async (req, res) => {
  try {
    let userId = req.body.userId;
    let clubId = req.body.clubId;
    const user = await User.findById(userId); // Get the current user
    const club = await Club.findById(clubId);

    if (user.followedClubs.includes(club._id)) {
      return res
        .status(400)
        .json({ message: "You are already following this stadium" });
    }

    // Add the stadium to the user's followedStadiums
    user.followedClubs.push(club);
    await user.save();

    // Add the user to the stadium's followers
    club.followers.push(user);
    await club.save();

    res.status(200).json({ message: "club followed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.unfollowClub = async (req, res) => {
  try {
    let userId = req.body.userId;
    let clubId = req.body.clubId;
    const user = await User.findById(userId); // Get the current user
    const club = await Club.findById(clubId);

    if (!user.followedClubs.includes(club._id)) {
      return res
        .status(400)
        .json({ message: "You are already unfollowing this stadium" });
    }

    // Add the stadium to the user's followedStadiums
    user.followedClubs.pull(club);
    await user.save();

    // Add the user to the stadium's followers
    club.followers.pull(user);
    await club.save();

    res.status(200).json({
      message: "club unfollowed successfullys",
      club: club,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getClub = async (req, res) => {
  let clubId = req.body.clubId;
  Club.find({ _id: clubId })
    .populate("stadiums")
    .exec((err, data) => {
      if (err) {
        return json.error({ error: err });
      }
      return res.json(data);
    });
};

async function getStadiumById(stadiumId) {
  try {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 14); // Calculate the end date (14 days from today)

    // Find the stadium by ID
    const stadium = await Stadium.findById(stadiumId);

    if (!stadium) {
      throw new Error("Stadium not found");
    }

    // Create an array to store all availability dates for the next 14 days
    const availabilityData = [];

    // Loop through each date within the range
    for (
      let date = new Date(today);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dayAvailability = stadium.availability.find(
        (day) => day.date.getTime() === date.getTime()
      );

      // If availability data doesn't exist for the current date, create it with default slots
      if (!dayAvailability) {
        stadium.availability.push({
          date: new Date(date),
          slots: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            status: "free", // Default status is "free"
          })),
        });

        availabilityData.push({
          date: new Date(date),
          slots: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            status: "free", // Default status is "free"
          })),
        });
      } else {
        availabilityData.push(dayAvailability);
      }
    }

    // Save the updated stadium document
    await stadium.save();

    return stadium;
  } catch (error) {
    console.error(
      "Error fetching or creating stadium availability:",
      error.message
    );
    throw error;
  }
}

exports.getStadiumAvailabilityData = async (req, res) => {
  const stadiumId = req.body.stadiumId;
  getStadiumById(stadiumId)
    .then((availabilityData) => {
      return res.json(availabilityData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(400).json({ error: "stadium user not found" });
    });
};

async function reserveSlot(stadiumId, date, hour) {
  try {
    // Find the stadium by ID
    const stadium = await Stadium.findById(stadiumId);

    if (!stadium) {
      throw new Error("Stadium not found");
    }

    // Find the availability data for the specified date
    const dayAvailability = stadium.availability.find(
      (day) => day.date.getTime() === date.getTime()
    );

    if (!dayAvailability) {
      throw new Error("Availability data not found for the specified date");
    }

    // Find the slot within the availability data for the specified hour
    const slot = dayAvailability.slots.find((slot) => slot.hour === hour);

    if (!slot) {
      throw new Error("Slot not found for the specified hour");
    }

    // Check if the slot is already reserved
    if (slot.status === "reserved") {
      throw new Error("Slot is already reserved");
    }

    // Update the slot's status to "reserved"
    slot.status = "reserved";

    // Save the updated stadium document
    await stadium.save();

    return stadium; // You can return the updated stadium document or a success message
  } catch (error) {
    console.error("Error reserving slot:", error.message);
    throw error;
  }
}

exports.reserveSlotForSomeone = async (req, res) => {
  const stadiumId = req.body.stadiumId;
  const date = req.body.date;
  const hour = req.body.hour;

  reserveSlot(stadiumId, date, hour)
    .then((availabilityData) => {
      return res.json(availabilityData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(400).json({ error: "stadium user not found" });
    });
};

const checkIfToday = (data) => {
  // Get the current date
  const currentDate = new Date();
  if (
    data.getDate() === currentDate.getDate() &&
    data.getMonth() === currentDate.getMonth() &&
    data.getFullYear() === currentDate.getFullYear()
  ) {
    return true;
  } else {
    return false;
  }
};
//get number of days between two dates
const getDifferenceBetweenDates = (date1, date2) =>
  parseInt((date2.getTime() - date1.getTime()) / (1000 * 3600 * 24));

// Function to calculate availability for the next 14 days
function calculateNext14DaysAvailability(oldAvailability) {
  const oldAvailabilityFirstDay = new Date(oldAvailability[0].date);
  // Check if the oldAvailabilityFirstDay is the same as the current date
  const isToday = checkIfToday(oldAvailabilityFirstDay);
  //return the oldAvilability as we don't need to create new one
  if (isToday) {
    return oldAvailability;
  } else {
    //check how many days are between today and the first date of availability
    const todayDate = new Date();
    const countOfDifferenceDays = getDifferenceBetweenDates(
      oldAvailabilityFirstDay,
      todayDate
    );

    const newAvailability = [];
    for (let i = 1; i <= 14; i++) {
      const date = moment().add(i, "days").startOf("day");
      const slots = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        status: "free",
      }));
      newAvailability.push({ date, slots });
    }
    oldAvailability.push(...newAvailability);
    // Remove the same number of objects from the beginning
    oldAvailability.splice(0, countOfDifferenceDays);

    return oldAvailability;
  }
}

exports.getNearClubs = async (req, res) => {
  let coordinates = req.body.coordinates;
  if (!coordinates) {
    coordinates = [30.2342, 31.2233];
  }

  const userLocation = {
    type: "Point",
    coordinates: coordinates,
  };

  Club.aggregate([
    {
      $geoNear: {
        near: userLocation,
        distanceField: "distance",
        spherical: true,
        maxDistance: 10000, // Maximum distance in meters (adjust as needed)
      },
    },
    {
      $lookup: {
        from: "stadia", // The name of the Stadium collection
        localField: "stadiums", // The field in the Club collection that refers to the Stadium
        foreignField: "_id", // The field in the Stadium collection that is matched
        as: "stadiums", // The name of the new field to populate with Stadium documents
      },
    },
  ])
    .then(async (result) => {
      // Update the stadiums' availability with next 14 days availability
      // Iterate through clubs and stadiums
      for (const club of result) {
        for (const stadium of club.stadiums) {
          // Calculate and update next 14 days availability
          stadium.availability = calculateNext14DaysAvailability(
            stadium.availability
          ).slice(0, 14);

          const options = {
            upsert: true, // If the document doesn't exist, insert a new one
          };
          Stadium.updateOne({ _id: stadium._id }, { $set: stadium }, options)
            .then((result) => {
              if (result.upserted) {
                console.log("New stadium inserted:", result.upserted[0]._id);
              } else {
                console.log("Stadium updated:", stadium._id);
              }
            })
            .catch((error) => {
              console.error("Error:", error);
            });
        }
      }

      return res.json({ result });
    })
    .catch((error) => {
      console.error(error);
      return res.status(400).json({ error });
    });
};

exports.createNewClub = async (req, res) => {
  const stadiums = req.body.stadiums;
  const stads = [];
  for (let i = 0; i < stadiums.length; i++) {
    const newStadium = new Stadium({
      name: stadiums[i].name,
      photos: stadiums[i].photos,
      size: stadiums[i].size,
    });
    await newStadium.save();
    stads.push(newStadium);
  }

  const newClub = new Club({
    name: req.body.name,
    stadiums: stads,
    address: req.body.address,
    cost: req.body.cost,
    photos: req.body.photos,
    location: req.body.location,
    description: req.body.description,
  });

  await newClub.save();
  return res.json({ message: "success" });
};

exports.clubReservation = (req, res) => {
  // Assuming you have obtained the user's desired reservation hours and date
  const desiredHours = req.body.desiredHours;
  const clubId = req.body.clubId;
  const reservationDate = new Date();

  // Find a club and its stadiums
  Club.findById({ _id: clubId })
    .populate("stadiums")
    .exec()
    .then((club) => {
      // Filter stadiums that are not already reserved for the desired hours and date
      const availableStadiums = club.stadiums.filter((stadium) =>
        Reservation.find({
          stadium: stadium._id,
          hours: { $in: desiredHours },
          date: reservationDate,
        })
          .exec()
          .then((reservations) => reservations.length === 0)
      );

      if (availableStadiums.length === 0) {
        // No available stadiums for the desired hours and date
        return res.status(404).json({
          error: "No available stadiums for the selected hours and date.",
        });
      }

      // Choose the first available stadium
      const assignedStadium = availableStadiums[0];

      // Create the reservation
      const reservation = new Reservation({
        club: club._id,
        user: userId,
        hours: desiredHours,
        date: reservationDate,
        stadium: assignedStadium._id,
      });

      return reservation.save();
    })
    .then((savedReservation) => {
      // Reservation saved successfully with assigned stadium
      res.status(201).json(savedReservation);
    })
    .catch((error) => {
      // Handle the error
      res
        .status(500)
        .json({ error: "An error occurred while saving the reservation." });
    });
};

exports.deactivate = (req, res) => {
  let username = req.body.username;
  let user;

  User.findOne({ username }).exec((err, userFromDB) => {
    if (err || !userFromDB) {
      return res.status(400).json({
        error: "User is not found",
      });
    }
    user = userFromDB;
    user.confirmed = USER_CONFIRMATION_STATUS.DEACTIVATED;

    user.save((err, result) => {
      if (err) {
        console.log("profile udpate error", err);
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      const emailData = {
        from: process.env.EMAIL_FROM, // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
        to: user.email, // WHO SHOULD BE RECEIVING THIS EMAIL? IT SHOULD BE YOUR GMAIL
        subject: ` لقد تم تعطيل حسابك - ${process.env.APP_NAME}`,
        html: `
            <h4>لقد تلقيت هذا البريد من موقع لتسكنوا:</h4>
            <p>لقد تم الأن تعطيل حسابك في موقع لتسكنوا</p>     
        `,
      };
      sendEmailWithNodemailer(req, res, emailData);
      // whatsappClient
      //   .sendMessage(`لقد تم تعطيل حسابكم في موقع لتسكنوا`)
      //   .then(() => {
      //     return res.json({
      //       message: `لقد تم تعطيل حسابكم في موقع لتسكنوا`,
      //     });
      //   })
      //   .catch((err) => {
      //     return res.status(401).json({
      //       error: `حصل خطأ ولم يتم ارسال الرسالة`,
      //     });
      //   });

      res.json({ message: `لقد تم تعطيل حساب المستخدم ${user.name}` });
    });
  });
};

exports.blockUser = (req, res) => {
  let username = req.body.username;
  let user;

  User.findOne({ username }).exec((err, userFromDB) => {
    if (err || !userFromDB) {
      return res.status(400).json({
        error: "ليس هناك مستخدم بهذا الكود",
      });
    }
    user = userFromDB;
    user.confirmed = USER_CONFIRMATION_STATUS.BLOCKED;

    user.save((err, result) => {
      if (err) {
        console.log("profile udpate error", err);
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      const emailData = {
        from: process.env.EMAIL_FROM, // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
        to: user.email, // WHO SHOULD BE RECEIVING THIS EMAIL? IT SHOULD BE YOUR GMAIL
        subject: ` لقد تم حظر حسابك - ${process.env.APP_NAME}`,
        html: `
            <h4>لقد تلقيت هذا البريد من موقع لتسكنوا:</h4>
            <p>لقد تم الأن حظر حسابك في موقع لتسكنوا</p>     
        `,
      };
      sendEmailWithNodemailer(req, res, emailData);

      res.json({ message: `لقد تم حظر حساب المستخدم ${user.name}` });
    });
  });
};

exports.activate = (req, res) => {
  let username = req.body.username;
  let user;

  User.findOne({ username }).exec((err, userFromDB) => {
    if (err || !userFromDB) {
      return res.status(400).json({
        error: "User is not found",
      });
    }
    user = userFromDB;
    user.confirmed = USER_CONFIRMATION_STATUS.ACCEPTED;

    user.save((err, result) => {
      if (err) {
        console.log("profile udpate error", err);
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      const emailData = {
        from: process.env.EMAIL_FROM, // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
        to: user.email, // WHO SHOULD BE RECEIVING THIS EMAIL? IT SHOULD BE YOUR GMAIL
        subject: ` لقد تم تفعيل حسابك - ${process.env.APP_NAME}`,
        html: `
            <h4>لقد تلقيت هذا البريد من موقع لتسكنوا:</h4>
            <p>لقد تم الأن تفعيل حسابك في موقع لتسكنوا</p>     
        `,
      };
      sendEmailWithNodemailer(req, res, emailData);
      // whatsappClient
      //   .sendMessage(`لقد تم تعطيل حسابكم في موقع لتسكنوا`)
      //   .then(() => {
      //     return res.json({
      //       message: `لقد تم تعطيل حسابكم في موقع لتسكنوا`,
      //     });
      //   })
      //   .catch((err) => {
      //     return res.status(401).json({
      //       error: `حصل خطأ ولم يتم ارسال الرسالة`,
      //     });
      //   });

      res.json({ message: `لقد تم تفعيل حسابك من جديد ` });
    });
  });
};

exports.getFavourites = (req, res) => {
  const userId = req.body.userId;
  User.findOne({ username: userId })
    .populate({
      path: "favourites",
      select: "questions confirmed gender userStatus username",
    })
    .exec((err, user) => {
      const favourites = user.favourites;
      if (err) {
        return res.status(400).json({
          error: err,
        });
      }
      console.log(favourites);
      return res.json(favourites);
    });
};

exports.searchUser = (req, res) => {
  const query = req.body.query;
  if (!query) {
    return res.status(400).json({
      error: "لم تقم بارسال أي بيانات ليتم البحث من خلالها",
    });
  }
  User.find({
    $or: [
      { email: { $regex: query, $options: "i" } },
      { phone: { $regex: query, $options: "i" } },
      { username: { $regex: query, $options: "i" } },
    ],
  }).exec((err, users) => {
    if (err || !users) {
      return res.status(400).json({
        error: err,
      });
    }
    return res.json({ users });
  });
};

exports.setUserRoomStatus = async (req, res) => {
  try {
    const roomId = req.body.roomId;
    const status = req.body.status;
    const senderUsername = req.body.username;
    const receiverUsername = req.body.receiver;
    const rejectionReason = req.body.rejectionReason;

    const senderUser = await User.findOne({ username: senderUsername });
    const receiverUser = await User.findOne({ username: receiverUsername });

    const privateRoom = await PrivateRoom.findOne({ roomId });

    if (!privateRoom) {
      return res.status(400).json({ error: "Private room not found" });
    }

    if (senderUser) {
      const userStatusKey =
        senderUser.gender === "man" ? "manStatus" : "womanStatus";
      privateRoom.roomStatus[userStatusKey] = status;
    }

    if (status === "2") {
      privateRoom.roomStatus.rejectionReason = rejectionReason;
      await privateRoom.save();

      await Request.findByIdAndUpdate(privateRoom.roomId, { status: 3 });

      await Promise.all([
        User.findByIdAndUpdate(privateRoom.sender, { userStatus: 0 }),
        User.findByIdAndUpdate(privateRoom.reciever, { userStatus: 0 }),
      ]);

      sendNotificationTo(
        receiverUser._id,
        "لقد اعتذر الطرف الآخر عن الاستمرار",
        `/users/${senderUser.username}`,
        req
      );
      return res.json({ message: "تم الرفض", data: privateRoom });
    } else if (status === "1") {
      if (
        privateRoom.roomStatus.manStatus === "1" &&
        privateRoom.roomStatus.womanStatus === "1"
      ) {
        const update = { status: 5 };
        await privateRoom.save();
        await Request.findByIdAndUpdate(privateRoom.roomId, update);

        // Create a new help request
        // const newHelpRequest = new HelpRequest({
        //   sender: privateRoom.sender, // sender's user ID
        //   reciever: privateRoom.reciever, // receiver's user ID
        //   status: 0, // set the status to PENDING (optional)
        // });

        // Save the help request to the database
        // await newHelpRequest.save();

        await Promise.all([
          User.findByIdAndUpdate(privateRoom.sender, { userStatus: 1 }),
          User.findByIdAndUpdate(privateRoom.reciever, { userStatus: 1 }),
        ]);
        sendNotificationTo(
          receiverUser._id,
          `لقد قمت بالتوافق مع كود ${senderUser.username} ووصلت الآن إلى مرحلة الرؤية الشرعية`,
          `/users/${senderUser.username}`,
          req
        );
        sendNotificationTo(
          senderUser._id,
          `لقد قمت بالتوافق مع كود ${receiverUser.username} ووصلت الآن إلى مرحلة الرؤية الشرعية`,
          `/users/${receiverUser.username}`,
          req
        );
        return res.json({ message: "تم القبول", data: privateRoom });
      }
      sendNotificationTo(
        receiverUser._id,
        `لقد قام الطرف الآخر بطلب رؤية شرعية. وهو ينتظر منك الموافقة على طلب الرؤية الشرعية`,
        `/users/${senderUser.username}`,
        req
      );
      await privateRoom.save();
    }

    return res.json({ message: "في انتظار الطرف الآخر", data: privateRoom });
  } catch (err) {
    console.error("Error setting user room status:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.fetchRequest = (req, res) => {
  const requestId = req.body.requestId;
  Request.findById(requestId)
    .populate("sender")
    .populate("reciever")
    .populate("privateRoom")
    .exec((err, data) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      return res.json({ data });
    });
};

exports.checkInFavourites = (req, res) => {
  const senderUsername = req.body.sender;
  const userToCheck = req.body.reciever;
  User.findOne({ username: senderUsername }).exec((err, user) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    } else {
      User.findOne({ username: userToCheck }).exec((err, result) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        } else {
          const inFavourites = user.favourites.includes(result);

          return res.json({ inFavourites });
        }
      });
    }
  });
};

exports.addFavourite = (req, res) => {
  const senderUsername = req.body.sender;
  const userToAdd = req.body.userToAdd;

  User.findOne({ username: userToAdd }).exec((err, user) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    } else {
      User.findOneAndUpdate(
        { username: senderUsername },
        {
          $push: {
            favourites: user,
          },
        },
        { new: true }
      ).exec((err, result) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        } else {
          return res.json({ message: "User added to favourites" });
        }
      });
    }
  });
};

exports.sendNotification = (req, res) => {
  const message = req.body.message;
  const senderUsername = req.body.username;
  const link = req.body.link;
  const newNotification = new Notification({ message, link, read: false });
  User.findOneAndUpdate(
    { username: senderUsername },
    {
      $push: {
        notifications: newNotification,
      },
    },
    { new: true }
  ).exec((err, result) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    } else {
      return res.json({ message: "تم ارسال الإشعار" });
    }
  });
};

exports.removeFavourite = (req, res) => {
  const senderUsername = req.body.sender;
  const userToRemove = req.body.userToRemove;

  User.findOne({ username: userToRemove }).exec((err, user) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    } else {
      User.findOneAndUpdate(
        { username: senderUsername },
        {
          $pull: {
            favourites: user._id,
          },
        },
        { new: true }
      ).exec((err, result) => {
        if (err) {
          return res.status(400).json({
            error: errorHandler(err),
          });
        } else {
          return res.json({ message: "User removed from favourites" });
        }
      });
    }
  });
};

const REQUEST_TIME = "1d";

exports.sendAcceptanceRequest = async (req, res) => {
  const { sender: senderUsername, reciever: recieverUsername } = req.body;

  try {
    const senderUser = await User.findOne({
      username: senderUsername,
    }).populate("sentRequests");

    if (!senderUser) {
      return res.status(400).json({ error: "Sender user not found" });
    }

    const lastRequestStatus =
      senderUser.sentRequests.length > 0
        ? senderUser.sentRequests[senderUser.sentRequests.length - 1].status
        : -1;

    if ([0, 1].includes(lastRequestStatus)) {
      const lastRequestToken =
        senderUser.sentRequests[senderUser.sentRequests.length - 1].token;

      if (lastRequestToken) {
        try {
          jwt.verify(
            lastRequestToken,
            process.env.JWT_ACCEPTANCE_REQUEST,
            async function (err, decoded) {
              if (err) {
                await updatePreviousRequestStatus(senderUser.sentRequests);
                await sendNewRequest(senderUsername, recieverUsername, req);
              } else {
                return res.json({
                  message: "لا يمكنك ارسال طلب جديد قبل انتهاء مدة طلبك السابق",
                });
              }
            }
          );
        } catch (err) {
          return res.status(500).json({ error: "Internal server error" });
        }
      }
    } else if ([2, 5].includes(lastRequestStatus)) {
      return res.json({
        message: "لا يمكنك ارسال طلب جديد لانك بالفعل مرتبط بشخص أخر",
      });
    } else if ([3, 4, 6].includes(lastRequestStatus)) {
      await sendNewRequest(senderUsername, recieverUsername, req);
    } else {
      await sendNewRequest(senderUsername, recieverUsername, req);
    }

    return res.json({
      message: "تم ارسال طلب القبول المبدئي بنجاح",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

async function updatePreviousRequestStatus(sentRequests) {
  const lastRequestId = sentRequests[sentRequests.length - 1]._id;
  await Request.findByIdAndUpdate(
    lastRequestId,
    { status: 4 },
    { new: true }
  ).exec();
}

async function sendNewRequest(senderUsername, recieverUsername, req) {
  const senderUser = await User.findOne({ username: senderUsername });
  const recieverUser = await User.findOne({ username: recieverUsername });

  if (!recieverUser) {
    throw new Error("Reciever user not found");
  }

  if (senderUser.gender === recieverUser.gender) {
    throw new Error("Cannot send request to a user with the same gender");
  }

  const token = jwt.sign(
    { senderUsername, recieverUsername },
    process.env.JWT_ACCEPTANCE_REQUEST,
    {
      expiresIn: REQUEST_TIME,
    }
  );

  const request = new Request({
    sender: senderUser,
    reciever: recieverUser,
    token,
  });

  await request.save();
  await User.findByIdAndUpdate(senderUser._id, {
    $push: { sentRequests: request },
  }).exec();
  await User.findByIdAndUpdate(recieverUser._id, {
    $push: { recievedRequests: request },
  }).exec();
  sendNotificationTo(
    recieverUser._id,
    `لقد تلقيت طلب قبول من كود ${senderUser.username}`,
    `/users/${senderUser.username}`,
    req
  );
}

exports.acceptRequest = async (req, res) => {
  try {
    const requestId = req.body.requestId;
    const requestData = await Request.findById(requestId)
      .populate("sender")
      .populate("reciever");

    if (!requestData) {
      return res.status(400).json({ error: "Request not found" });
    }

    // Get all related requests (pending) from sender and receiver and convert them to timeover status
    const requestsToUpdate = requestData.reciever.recievedRequests
      .concat(requestData.reciever.sentRequests)
      .concat(requestData.sender.recievedRequests);

    // Send notification to the receiver
    const emailData = {
      from: process.env.EMAIL_FROM,
      to: requestData.reciever.email,
      subject: ` لقد تم الرد على طلب القبول الذي أرسلته - ${process.env.APP_NAME}`,
      html: `
            <h4>لقد تلقيت هذا البريد من موقع لتسكنوا:</h4>
            <p>لقد قام المستخدم كود - ${requestData.sender.username} - </p>
            <p>بقبول طلب التواصل الذي أرسلته ويمكنكما الأن الدخول لمرحلة الأسئلة</p>
            <hr />
            <p>${process.env.CLIENT_URL_PRODUCTION}/users/${requestData.reciever.username}</p>
        `,
    };
    sendEmailWithNodemailer(req, res, emailData);
    sendNotificationTo(
      requestData.sender._id,
      `لقد وافق كود ${requestData.sender.username} على طلب القبول المبدئي ويمكنكما الآن الدخول لمرحلة الأسئلة`,
      `/users/${requestData.reciever.username}`,
      req
    );
    // Update sender and receiver userStatus to 1 (accepted request)
    await Promise.all([
      User.updateOne({ _id: requestData.sender._id }, { userStatus: 1 }),
      User.updateOne({ _id: requestData.reciever._id }, { userStatus: 1 }),
    ]);

    // Update the request status to "accepted" (status: 2)
    await Request.updateOne({ _id: requestId }, { status: "2" });

    // Update other pending requests to timeover status (status: 4)
    await Request.updateMany(
      {
        _id: { $in: requestsToUpdate },
        status: 0, // only update requests with status = 0 (pending)
      },
      { $set: { status: 4 } }
    );

    return res.json({
      message: "تم قبول الطلب بنجاح ... ستنتقل الآن لمرحلة الأسئلة",
    });
  } catch (err) {
    console.error("Error accepting request:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const requestId = req.body.requestId;
    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      { status: 3 },
      { new: true }
    ).populate("sender");

    if (!updatedRequest) {
      return res.status(400).json({ error: "Request not found" });
    }

    // Send notification to the sender about the rejection
    sendNotificationTo(
      updatedRequest.sender,
      "لقد اعتذر الطرف الآخر عن قبول طلبك",
      "/requests",
      req
    );

    return res.json({
      message: "تم رفض الطلب ... وفقكم الله لمن هو خير",
    });
  } catch (err) {
    console.error("Error rejecting request:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.makeRequestFailed = (req, res) => {
  const requestId = req.body.requestId;

  Request.findByIdAndUpdate(
    requestId,
    {
      status: 6,
    },
    { new: true }
  )
    .populate("sender")
    .populate("reciever")
    .exec(async (err, result) => {
      if (err) {
        return res.status(400).json({
          error: errorHandler(err),
        });
      } else {
        User.findByIdAndUpdate(result.sender._id, { userStatus: 0 }).exec(
          (err, user) => {}
        );
        User.findByIdAndUpdate(result.reciever._id, { userStatus: 0 }).exec(
          (err, user) => {}
        );
        sendNotificationTo(
          result.sender._id,
          "لقد اعتذر الطرف الآخر عن الاستمرار في الخطبة",
          `/users/${result.reciever.username}`,
          req
        );
        sendNotificationTo(
          result.reciever._id,
          "لقد اعتذر الطرف الآخر عن الاستمرار في الخطبة",
          `/users/${result.sender.username}`,
          req
        );
        return res.json({
          message: "تم إنهاء الطلب ... وفقكم الله لمن هو خير",
        });
      }
    });
};

exports.getUsers = (req, res) => {
  let pageSize = req.body.pageSize ? parseInt(req.body.pageSize) : 20;
  let pageNumber = req.body.pageNumber ? parseInt(req.body.pageNumber) : 1;
  let gender = req.body.gender;
  let generalStatus = req.body.status;
  let country = req.body.country;
  let nationality = req.body.nationality;
  let state = req.body.state;
  let face = req.body.face;
  let age = req.body.age;

  const skip = (pageNumber - 1) * pageSize;
  const limit = pageSize;
  let users;

  let query = { role: 0, confirmed: 1 };
  if (gender) {
    query.gender = gender;
  }

  if (generalStatus) {
    query["questions.0"] = generalStatus;
  }

  if (country) {
    query["questions.1"] = country;
  }

  if (nationality) {
    query["questions.36"] = nationality;
  }

  if (state) {
    query["questions.16"] = state;
  }

  if (face && gender === "man") {
    query["questions.23"] = face;
  }

  if (face && gender === "woman") {
    query["questions.12"] = face;
  }

  if (age) {
    let ages = age.split("-");
    const minAge = ages[0];
    const maxAge = ages[1];
    query["questions.6"] = { $gte: minAge, $lte: maxAge };
  }

  User.find(query)
    .sort({ createdAt: -1 })
    .select(`username gender questions createdAt`)
    .skip(skip)
    .limit(limit)
    .exec(async (err, data) => {
      if (err) {
        return res.status(400).json({ error: errorHandler(err) });
      }

      users = data;
      const totalSize = await User.countDocuments(query);
      //delete father's phone number from each user
      if (gender === "woman") {
        const excludedNumbers = ["0", "1", "6", "12", "16"]; // list of numbers to exclude

        for (let i = 0; i < users.length; i++) {
          for (let j = 0; j < 48; j++) {
            const key = j.toString();

            if (!excludedNumbers.includes(key)) {
              users[i].questions.delete(key);
            }
          }
        }
      }
      // console.log(users);
      return res.json({ users, size: totalSize });
    });
};

exports.read = (req, res) => {
  req.profile.hashed_password = undefined;
  return res.json(req.profile);
};

exports.getStatistics = async (req, res) => {
  const totalActiveUsers = await User.countDocuments({});
  const totalAcceptedRequests = await Request.countDocuments({
    status: { $in: [0, 2, 5, 6] },
  });
  const totalMarry = await Request.countDocuments({
    status: { $in: [5, 6] },
  });

  return res.json({ totalActiveUsers, totalAcceptedRequests, totalMarry });
};

exports.getQuestions = (req, res) => {
  return res.json(questions);
};

exports.getUsersNeedContact = (req, res) => {
  Request.find({
    status: 5,
  })
    .sort({ createdAt: -1 })
    .populate("sender", "gender phone username name questions")
    .populate("reciever", "gender phone username name questions")
    .exec((err, requests) => {
      if (err || !requests) {
        console.log(err);

        return res.status(400).json({
          error: "No chats found",
        });
      }

      let needContactRequests = requests.filter((request) => {
        if (!request.sender || !request.reciever) {
          return false;
        }
        if (request.sender.gender === "woman") {
          if (request.sender.questions.get("37") === "لا") {
            return true;
          }
        } else {
          if (request.reciever.questions.get("37") === "لا") {
            return true;
          }
        }
        return false;
      });
      res.json({
        data: needContactRequests,
      });
    });
};

exports.listChats = (req, res) => {
  Request.find({
    status: 2,
  })
    .sort({ createdAt: -1 })
    .populate("sender", "username")
    .populate("reciever", "username")
    .exec((err, requests) => {
      if (err || !requests) {
        console.log(err);

        return res.status(400).json({
          error: "No chats found",
        });
      }
      const data = requests.filter((item) => {
        return item.sender && item.reciever;
      });

      res.json({
        data,
      });
    });
};

exports.getMenThatNeedConfirmations = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  User.findOne({ idPhoto1: { $ne: "" }, gender: "man" })

    .allowDiskUse(true)
    // .select("-idPhoto1 -idPhoto2")
    .exec((err, user) => {
      // console.log(user);
      if (err || !user) {
        console.log(err);

        return res.status(400).json({
          error: "No user found",
        });
      }
      res.json({
        user,
      });
    });
};

exports.getWomenThatNeedConfirmations = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  User.findOne({ confirmed: 0, gender: "woman" })
    .allowDiskUse(true)
    // .select("-idPhoto1 -idPhoto2")
    .exec((err, user) => {
      if (err || !user) {
        console.log(err);

        return res.status(400).json({
          error: "لا توجد أي طلبات تسجيل حاليا",
        });
      }
      res.json({
        user,
      });
    });
};

exports.getUsersReports = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  Report.find({ confirmed: 0 })

    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec((err, reports) => {
      if (err || !reports) {
        return res.status(400).json({
          error: "No reports found",
        });
      }
      res.json({
        reports,
      });
    });
};

exports.readNotification = (req, res) => {
  const notificationId = req.body.notificationId;

  Notification.findByIdAndUpdate(
    { _id: notificationId },
    { read: true },
    { new: true }
  ).exec((err, data) => {
    if (err || !data) {
      console.log(err);
      return res.status(400).json({
        error: "Error getting notifications",
      });
    }
    res.json({ message: "تم قراءة الإشعار" });
  });
};

exports.getMyNotifications = (req, res) => {
  const userId = req.body.userId;
  const notificationsLimit = 10; // Set the desired limit here

  User.findById({ _id: userId })
    .populate({ path: "notifications", options: { limit: notificationsLimit } })
    .exec((err, data) => {
      if (err || !data) {
        console.log(err);
        return res.status(400).json({
          error: "Error getting notifications",
        });
      }
      res.json(data.notifications);
    });
};

exports.rejectUser = (req, res) => {
  let username = req.body.username;
  let rejectionReason = req.body.rejectionReason;
  let user;

  User.findOne({ username }).exec((err, userFromDB) => {
    if (err || !userFromDB) {
      return res.status(400).json({
        error: "User is not found",
      });
    }
    user = userFromDB;
    user.rejectionReason = rejectionReason;
    user.confirmed = 2;
    user.idPhoto1 = "";
    user.idPhoto2 = "";
    user.save((err, result) => {
      if (err) {
        console.log("profile udpate error", err);
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      const emailData = {
        from: process.env.EMAIL_FROM, // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
        to: user.email, // WHO SHOULD BE RECEIVING THIS EMAIL? IT SHOULD BE YOUR GMAIL
        subject: ` لقد تم رفض تسجيل حسابك - ${process.env.APP_NAME}`,
        html: `
            <h4>لقد تلقيت هذا البريد من موقع لتسكنوا:</h4>
            <p>لقد تم رفض تسجيل حسابك في موقع لتسكنوا</p>
            <p>سبب الرفض:${rejectionReason}</p>
            <hr />
            <p>${process.env.EMAIL_TO}</p>
        `,
      };
      sendEmailWithNodemailer(req, res, emailData);
      sendNotificationTo(
        result._id,
        `لقد تم رفض طلبك للتسجيل بسبب ${rejectionReason}`,
        "/user",
        req
      );
      res.json({ message: `User ${user.username} rejected` });
    });
  });
};

exports.confirmUser = (req, res) => {
  let username = req.body.username;
  let user;

  User.findOne({ username })
    .select("-idPhoto1 -idPhoto2")
    .exec((err, userFromDB) => {
      if (err || !userFromDB) {
        return res.status(400).json({
          error: "User is not found",
        });
      }
      user = userFromDB;
      user.confirmed = 1;
      user.idPhoto1 = "";
      user.idPhoto2 = "";
      user.save((err, result) => {
        if (err) {
          console.log("profile udpate error", err);
          return res.status(400).json({
            error: errorHandler(err),
          });
        }
        const emailData = {
          from: process.env.EMAIL_FROM, // MAKE SURE THIS EMAIL IS YOUR GMAIL FOR WHICH YOU GENERATED APP PASSWORD
          to: user.email, // WHO SHOULD BE RECEIVING THIS EMAIL? IT SHOULD BE YOUR GMAIL
          subject: ` لقد تم تفعيل حسابك - ${process.env.APP_NAME}`,
          html: `
              <h4>لقد تلقيت هذا البريد من موقع لتسكنوا:</h4>
              <p>لقد تم الأن تفعيل حسابك في موقع لتسكنوا</p>
              <p>يمكنك الأن إرسال الطلبات واستقبالها</p>
              <hr />
              <p>${process.env.EMAIL_TO}</p>
          `,
        };
        sendEmailWithNodemailer(req, res, emailData);
        sendNotificationTo(
          result._id,
          "لقد تم تفعيل حسابك. يمكنك الآن إرسال طلبات القبول واستقبالها",
          "/user",
          req
        );
        res.json({ message: `لقد تم تفعيل حساب المستخدم ${user.name}` });
      });
    });
};

const sendNotificationTo = async (
  receiverId,
  notificationMessage,
  link = "/",
  req
) => {
  try {
    // Save notification object to receiver collection
    const newNotification = new Notification({
      receiver: JSON.stringify(receiverId),
      message: notificationMessage,
      link,
      read: false,
    });
    await newNotification.save();

    // Add the notification to the user's notifications array
    const updatedUser = await User.findByIdAndUpdate(
      receiverId,
      {
        $push: {
          notifications: newNotification,
        },
      },
      { new: true }
    );

    // Send notification if receiver is online
    const socket = req.userSocketMap.get(JSON.stringify(receiverId));
    if (socket) {
      socket.emit("newNotification", {
        message: notificationMessage,
        link,
        createdAt: newNotification.createdAt,
        read: false,
      });
    } else {
      console.log(`User with ID ${receiverId} not connected`);
    }

    return updatedUser;
  } catch (err) {
    console.error(
      `Error sending notification to user with ID ${receiverId}:`,
      err
    );
  }
};

exports.publicProfile = (req, res) => {
  let username = req.params.username;
  let user;
  let blogs;
  User.findOne({ username })
    .select(
      "username _id questions gender sentRequests recievedRequests userStatus confirmed role favourites"
    )
    .populate("recievedRequests", "sender status createdAt")
    .populate({
      path: "recievedRequests",
      populate: { path: "sender", select: "username" },
    })
    .populate("sentRequests", "reciever status createdAt")
    .populate({
      path: "sentRequests",
      populate: { path: "reciever", select: "username" },
    })
    .exec((err, userFromDB) => {
      if (err || !userFromDB) {
        return res.status(400).json({
          error: "User not found",
        });
      }
      user = userFromDB;
      let userId = user._id;
      Blog.find({ postedBy: userId })
        .populate("categories", "_id name slug")
        .populate("tags", "_id name slug")
        .populate("postedBy", "_id name")
        .limit(10)
        .select(
          "_id title slug excerpt categories tags postedBy createdAt updatedAt"
        )
        .exec((err, data) => {
          if (err) {
            return res.status(400).json({
              error: errorHandler(err),
            });
          }
          //delete father's phone number from each user
          if (data.gender === "woman") {
            const excludedNumbers = ["0", "1", "6", "12", "16"]; // list of numbers to exclude

            for (let j = 0; j < 48; j++) {
              const key = j.toString();
              if (!excludedNumbers.includes(key)) {
                user.questions.delete(key);
              }
            }
          }
          user.hashed_password = undefined;
          user.phone = undefined;
          user.name = undefined;
          user.idPhoto1 = undefined;
          user.idPhoto2 = undefined;
          user.idNumber = undefined;
          res.json({
            user,
            blogs: data,
          });
        });
    });
};

exports.update = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtension = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: "Photo could not be uploaded",
      });
    }

    let user = req.profile;
    // user's existing role and email before update
    let existingRole = user.role;
    let existingEmail = user.email;

    if (fields && fields.username && fields.username.length > 12) {
      return res.status(400).json({
        error: "Username should be less than 12 characters long",
      });
    }

    if (fields.username) {
      fields.username = slugify(fields.username).toLowerCase();
    }

    if (fields.password && fields.password.length < 6) {
      return res.status(400).json({
        error: "Password should be min 6 characters long",
      });
    }

    fields.questions = JSON.parse(fields.questions);

    user = _.extend(user, fields);
    // user's existing role and email - dont update - keep it same
    user.role = existingRole;
    user.email = existingEmail;

    if (files.photo) {
      if (files.photo.size > 10000000) {
        return res.status(400).json({
          error: "Image should be less than 1mb",
        });
      }
      user.photo.data = fs.readFileSync(files.photo.filepath);
      user.photo.contentType = files.photo.type;
    }

    user.save((err, result) => {
      if (err) {
        console.log("profile udpate error", err);
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      user.hashed_password = undefined;
      user.salt = undefined;
      user.photo = undefined;
      user.questions = undefined;
      user.phone = undefined;
      user.idPhoto1 = undefined;
      user.idPhoto2 = undefined;
      res.json(user);
    });
  });
};

exports.photo = (req, res) => {
  const username = req.params.username.toLowerCase();
  User.findOne({ username })
    .select("photo")
    .exec((err, user) => {
      if (err || !user) {
        return res.status(400).json({ error: "User not found" });
      }
      if (user.photo.data) {
        res.set("Content-Type", user.photo.type);
        return res.send(user.photo.data);
      }
    });
};
