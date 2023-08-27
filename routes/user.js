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
  clubReservation,
  getNearClubs,
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

router.post(
  "/user/club-reservation",
  requireSignIn,
  authMiddleware,
  clubReservation
);

router.get("/users-statistics", getStatistics);
router.get("/user/profile", requireSignIn, authMiddleware, read);
router.get("/user/:username", publicProfile);
router.put("/user/update", requireSignIn, authMiddleware, update);
router.get("/user/photo/:username", photo);
router.post("/users", getUsers);
router.post("/users/near-clubs", getNearClubs);
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
router.post(
  "/users/create-club",
  requireSignIn,
  adminMiddleware,
  createNewClub
);
router.put("/users/block-user", requireSignIn, adminMiddleware, blockUser);

router.post("/users/search", requireSignIn, adminMiddleware, searchUser);

router.get("/users/reports", requireSignIn, adminMiddleware, getUsersReports);

module.exports = router;
