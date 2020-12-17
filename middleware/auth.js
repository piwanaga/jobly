// middleware for authorization/authentication

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

// check token
function authenticateJWT(req, res, next) {
    try {
      const tokenFromBody = req.body._token;
      const payload = jwt.verify(tokenFromBody, SECRET_KEY);
      req.user = payload; // create a current user
      return next();
    } catch (err) {
      return next();
    }
}

// check if user is logged in
function ensureLoggedIn(req, res, next) {
    if (!req.user) {
      return next({ status: 401, message: "Unauthorized" });
    } else {
      return next();
    }
}

// check if correct user is logged in
function ensureCorrectUser(req, res, next) {
    try {
      if (req.user.username === req.params.username) {
        return next();
      } else {
        return next({ status: 401, message: "Unauthorized" });
      }
    } catch (err) {
      // errors would happen here if we made a request and req.user is undefined
      return next({ status: 401, message: "Unauthorized" });
    }
}

// check if user is admin
function ensureIsAdmin(req, res, next) {
    try {
        if (req.user.is_admin === true) {
            return next()
        } else {
            return next({ status: 401, message: "Unauthorized" })
        }
    } catch (e) {
        return next({ status: 401, message: "Unauthorized" });
    }
}

module.exports = { authenticateJWT, ensureLoggedIn, ensureCorrectUser, ensureIsAdmin }