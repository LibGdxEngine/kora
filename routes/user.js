const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  requireSignIn,
  adminMiddleware,
  logUserBehavior,
} = require("../controllers/auth");
const {
  read,
  publicProfile,
  update,
  photo,
  getUsers,
  addFavourite,
  removeFavourite,
  getUsersReports,
  getFavourites,
  sendNotification,
  searchUser,
  blockUser,
  getStatistics,
  getMyNotifications,
  readNotification,
  createNewClub,

  getNearClubs,
  // getClub,
  getStadiumAvailabilityData,
  followClub,
  unfollowClub,
  // stadiumReservation,
} = require("../controllers/user");

router.post("/user/favourites", getFavourites);

router.post(
  "/user/read-notification",
  requireSignIn,
  authMiddleware,
  readNotification
);
router.post(
  "/user/my-notifications",
  requireSignIn,
  authMiddleware,
  getMyNotifications
);

router.post("/user/follow-club", requireSignIn, authMiddleware, followClub);

router.post("/user/unfollow-club", requireSignIn, authMiddleware, unfollowClub);

router.post("/user/get-club", getStadiumAvailabilityData);
// router.post("/user/getStadiumAvailabilityData", getStadiumAvailabilityData);

router.get("/users-statistics", getStatistics);
router.get("/user/profile", requireSignIn, authMiddleware, read);
router.get("/user/:username", publicProfile);
router.put("/user/update", requireSignIn, authMiddleware, update);
router.get("/user/photo/:username", photo);
router.post("/users", getUsers);
router.post("/user/near-clubs", getNearClubs);
router.post(
  "/user/add-favourite",
  requireSignIn,
  authMiddleware,
  logUserBehavior,
  addFavourite
);
router.post(
  "/user/remove-favourite",
  requireSignIn,
  authMiddleware,
  logUserBehavior,
  removeFavourite
);

router.post(
  "/user/send-notification",
  requireSignIn,
  authMiddleware,
  sendNotification
);
//Admin operations
router.post("/user/create-club", requireSignIn, adminMiddleware, createNewClub);
router.put("/user/block-user", requireSignIn, adminMiddleware, blockUser);

router.post("/user/search", requireSignIn, adminMiddleware, searchUser);

router.get("/user/reports", requireSignIn, adminMiddleware, getUsersReports);

module.exports = router;
