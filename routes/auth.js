// auth routes

const express = require('express')
const router = new express.Router()
const ExpressError = require("../helpers/expressError");
const User = require('../models/user');

const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config')

// login route
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body
        const result = await User.authenticate(username, password)

        if (result !== false) {
            let token = jwt.sign({ username, is_admin: result.is_admin }, SECRET_KEY)
            return res.json({ token })
        } else {
            // if login fails
            return next(new ExpressError('Invalid credentials', 400))
        }

    } catch (e) {
        return next(e)
    }
})

module.exports = router