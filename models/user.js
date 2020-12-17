// class for user

const db = require("../db");
const ExpressError = require("../helpers/expressError");
const sqlForPartialUpdate = require('../helpers/partialUpdate')

class User {
    // authenticate a user
    static async authenticate(username, password) {
        const result = await db.query(
            `SELECT username, password, is_admin
            FROM users
            WHERE username = $1`,
            [username]
        )
        const user = result.rows[0]

        if (!user) {
            throw new ExpressError('Username not found', 404)
        }

        return user.username === username && user.password === password ? user : false

    }

    // get a list of users
    static async get() {
        const results = await db.query(
            `SELECT username, first_name, last_name, email
            FROM users`
        )
        return results.rows
    }

    // get single user
    static async getOne(username) {
        const results = await db.query(
            `SELECT username, first_name, last_name, email, photo_url, is_admin
            FROM users
            WHERE username = $1`,
            [username]
        )
        return results.rows
    }

    // create new user
    static async create({ username, password, first_name, last_name, email, photo_url, is_admin }) {
        if (!is_admin) {
            is_admin = false
        }

        const result = await db.query(
            `INSERT INTO users
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING username, password, first_name, last_name, email, photo_url, is_admin`,
            [username, password, first_name, last_name, email, photo_url, is_admin]
        )

        return result.rows[0]
    }

    // update user
    static async update(items, username) {
        const query = sqlForPartialUpdate('users', items, 'username', username)
        const result = await db.query(query.query, query.values)
        return result.rows
    }

    // delete a user
    static async delete (username) {
        const result = await db.query(
            `DELETE FROM users
            WHERE username = $1
            RETURNING username`,
            [username]
        )
        return result.rows
    }
}

module.exports = User