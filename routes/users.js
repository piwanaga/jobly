// users routes

const express = require('express')
const router = new express.Router()
const ExpressError = require("../helpers/expressError");
const User = require('../models/user')
const { ensureCorrectUser } = require('../middleware/auth')

const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config')

const jsonschema = require('jsonschema')
const usersPostSchema = require('../schemas/users-post-schema.json')
const usersPatchSchema = require('../schemas/users-patch-schema.json')

// get all users
router.get('/', async (req, res, next) => {
    try {
        const results = await User.get()
        return res.json({users: results})
    } catch (e) {
        return next(e)
    }
})

// create a new user
router.post('/', async (req, res, next) => {
    try {
        const validate = jsonschema.validate(req.body, usersPostSchema)

        if (!validate.valid) {
        let listOfErrors = validate.errors.map(e => e.stack)
        let error = new ExpressError(listOfErrors, 400)
        return next(error)
        }

        // create token with username and is_admin
        const result = await User.create(req.body)
        let token = jwt.sign({ username: result.username, is_admin: result.is_admin }, SECRET_KEY)
        return res.json({ token })
        
    } catch (e) {
        if (e.code === '23505') {
            return next(new ExpressError('Username already taken', 400))
        }
        return next(e)
    }
})

// get single user by username
router.get('/:username', async (req, res, next) => {
    try {
        const { username } = req.params
        const result = await User.getOne(username)

        if (result.length === 0) {
            return next()
        }
        
        return res.json({user: result[0]})
    } catch (e) {
        return next(e)
    }
})

// update a user
router.patch('/:username', ensureCorrectUser, async (req, res, next) => {
    try {
        const validate = jsonschema.validate(req.body, usersPatchSchema)

        if (!validate.valid) {
        let listOfErrors = validate.errors.map(e => e.stack)
        let error = new ExpressError(listOfErrors, 400)
        return next(error)
        }

        const { username } = req.params
        const result = await User.update(req.body, username)
        
        if (!result[0]) {
            return next()
        }

        // remove password from result so it is not displayed
        for (let key in result[0]) {
            if (key === "password") {
              delete result[0][key];
            }
          }
        
        //   sign new token if username or is_admin is updated
        if ('username' in req.body || 'is_admin' in req.body) {
            let token = jwt.sign({ username: result[0].username, is_admin: result[0].is_admin }, SECRET_KEY)
            return res.json({user: result[0], new_token: token})
        }

        return res.json({user: result[0]})
    } catch (e) {
        return next(e)
    }
})

// delete a user
router.delete('/:username', ensureCorrectUser ,async (req, res, next) => {
    try {
        const { username } = req.params
        const result = await User.delete(username)

        if (result.length === 0) {
            return next()
        }
        return res.json({message: "User deleted"})
    } catch (e) {
        return next(e)
    }
})

module.exports = router