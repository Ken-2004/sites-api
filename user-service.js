const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const userSchema = require('./modules/userSchema');

let User;

module.exports.connect = function () {
  return new Promise((resolve, reject) => {
    let db = mongoose.createConnection(process.env.MONGO_URL);

    db.on('error', (err) => {
      reject(err);
    });

    db.once('open', () => {
      User = db.model('users', userSchema);
      resolve();
    });
  });
};

module.exports.registerUser = function (userData) {
  return new Promise((resolve, reject) => {
    if (userData.password !== userData.password2) {
      reject('Passwords do not match');
    } else {
      bcrypt.hash(userData.password, 10).then((hash) => {
        userData.password = hash;

        let newUser = new User(userData);
        newUser.save().then(() => {
          resolve('User ' + userData.userName + ' successfully registered');
        }).catch((err) => {
          if (err.code === 11000) {
            reject('User Name already taken');
          } else {
            reject('There was an error creating the user: ' + err);
          }
        });
      }).catch(() => {
        reject('There was an error encrypting the password');
      });
    }
  });
};

module.exports.checkUser = function (userData) {
  return new Promise((resolve, reject) => {
    User.findOne({ userName: userData.userName }).exec().then((user) => {
      if (!user) {
        reject('Unable to find user: ' + userData.userName);
      } else {
        bcrypt.compare(userData.password, user.password).then((result) => {
          if (result) {
            resolve(user);
          } else {
            reject('Incorrect password for user: ' + userData.userName);
          }
        });
      }
    }).catch(() => {
      reject('Unable to find user: ' + userData.userName);
    });
  });
};

module.exports.getFavourites = function (id) {
  return new Promise((resolve, reject) => {
    User.findById(id).exec().then((user) => {
      if (!user) {
        reject('Cannot find user with id: ' + id);
      } else {
        resolve(user.favourites);
      }
    }).catch(() => {
      reject('Cannot find user with id: ' + id);
    });
  });
};

module.exports.addFavourite = function (id, favId) {
  return new Promise((resolve, reject) => {
    User.findByIdAndUpdate(
      id,
      { $addToSet: { favourites: favId } },
      { new: true }
    ).exec().then((user) => {
      if (!user) {
        reject('Cannot find user with id: ' + id);
      } else {
        resolve(user.favourites);
      }
    }).catch(() => {
      reject('Cannot find user with id: ' + id);
    });
  });
};

module.exports.removeFavourite = function (id, favId) {
  return new Promise((resolve, reject) => {
    User.findByIdAndUpdate(
      id,
      { $pull: { favourites: favId } },
      { new: true }
    ).exec().then((user) => {
      if (!user) {
        reject('Cannot find user with id: ' + id);
      } else {
        resolve(user.favourites);
      }
    }).catch(() => {
      reject('Cannot find user with id: ' + id);
    });
  });
};
