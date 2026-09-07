const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userSchema = require("./modules/userSchema");
const { AuthenticationError, ConflictError, NotFoundError } = require("./errors");

let User;
let connectionPromise;

async function connect() {
  if (User) return;
  if (!connectionPromise) {
    connectionPromise = mongoose.createConnection(process.env.MONGO_URL).asPromise()
      .then((db) => {
        User = db.model("users", userSchema);
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }
  await connectionPromise;
}

async function registerUser(userData) {
  await connect();
  const password = await bcrypt.hash(userData.password, 10);

  try {
    await User.create({
      userName: userData.userName,
      password,
      favourites: []
    });
    return `User ${userData.userName} successfully registered`;
  } catch (error) {
    if (error && error.code === 11000) {
      throw new ConflictError("Username is already in use");
    }
    throw error;
  }
}

async function checkUser(userData) {
  await connect();
  const user = await User.findOne({ userName: userData.userName }).select("+password").exec();
  if (!user || !(await bcrypt.compare(userData.password, user.password))) {
    throw new AuthenticationError();
  }
  return user;
}

async function getFavourites(id) {
  await connect();
  const user = await User.findById(id).exec();
  if (!user) throw new NotFoundError("User not found");
  return user.favourites;
}

async function addFavourite(id, favouriteId) {
  await connect();
  const user = await User.findByIdAndUpdate(
    id,
    { $addToSet: { favourites: favouriteId } },
    { new: true, runValidators: true }
  ).exec();
  if (!user) throw new NotFoundError("User not found");
  return user.favourites;
}

async function removeFavourite(id, favouriteId) {
  await connect();
  const user = await User.findByIdAndUpdate(
    id,
    { $pull: { favourites: favouriteId } },
    { new: true, runValidators: true }
  ).exec();
  if (!user) throw new NotFoundError("User not found");
  return user.favourites;
}

module.exports = {
  addFavourite,
  checkUser,
  connect,
  getFavourites,
  registerUser,
  removeFavourite
};
