process.env.NODE_ENV = "test"

const request = require("supertest");
const app = require("../../app");
const db = require("../../db");
const User = require('../../models/user')
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../../config')

describe("test users routes", () => {
    let testUser
    let testUserToken

    // create testuser
    beforeEach(async function () {
        await db.query("DELETE FROM users");

        testUser = await User.create({
            username: "test_user",
            password: "password",
            first_name: "john",
            last_name: "doe",
            email: "johndoe@email.com",
            photo_url: "www.test.com",
            is_admin: true
        });

        // create testuser token to test authorization
        testUserToken = jwt.sign({username: testUser.username, is_admin: testUser.is_admin}, SECRET_KEY)
    });

    describe("GET /users", () => {
        test("return list of users", async () => {
            const resp = await request(app).get('/users')

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({users: [{
                "username": "test_user",
                "first_name": "john",
                "last_name": "doe",
                "email": "johndoe@email.com"
            }]})
        });
    });

    describe("POST /users", () => {
        test("can create new user", async () => {
            const data = {
                "username": "new_user",
                "password": "password",
                "first_name": "new",
                "last_name": "user",
                "email": "newuser@email.com",
                "photo_url": "www.new.com", 
                "is_admin": true 
            }
        
            const resp = await request(app).post('/users').send(data)

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({token: expect.any(String)})
        })

        test("cannot create new user with missing data", async () => {
            const data = {
                "password": "missing username",
                "first_name": "new",
                "last_name": "user",
                "email": "newuser@email.com"
            }
            const resp = await request(app).post('/users').send(data)

            expect(resp.statusCode).toEqual(400)
        })
    })

    describe("GET /users/:username", () => {
        test("get single user and do not show password", async () => {
            const resp = await request(app).get(`/users/${testUser.username}`)

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({
                user: {
                    "username": "test_user",
                    "first_name": "john",
                    "last_name": "doe",
                    "email": "johndoe@email.com",
                    "photo_url": "www.test.com",
                    "is_admin": true
            }})
        })

        test("return 404 if username not found", async () => {
            const resp = await request(app).get('/users/1invalidusername')

            expect(resp.statusCode).toEqual(404)
        })
    })

    describe("PATCH /users/:username", () => {
        test("can update user", async () => {
            const resp = await request(app).patch(`/users/${testUser.username}`).send({
                username: "NEW USER", 
                email: "NEWUSER@email.com",
                _token: testUserToken
            })

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({
                user: {
                    "username": "NEW USER",
                    "first_name": "john",
                    "last_name": "doe",
                    "email": "NEWUSER@email.com",
                    "photo_url": "www.test.com",
                    "is_admin": true
                },
                "new_token": expect.any(String)
            })
        })

        test("cannot update with invalid data", async() => {
            const resp = await request(app).patch(`/users/${testUser.username}`).send({is_admin: "invalid data type", _token: testUserToken})

            expect(resp.statusCode).toEqual(400)
        })

        test("return 401 if username not found", async () => {
            const resp = await request(app).patch('/users/invalidusername').send({first_name: "JOHN"})

            expect(resp.statusCode).toEqual(401)
        })
    })

    describe("DELETE /users", () => {
        test("can delete user", async () => {
            const resp = await request(app).delete(`/users/${testUser.username}`).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({message: "User deleted"})
        })
    })


    afterAll(async function () {
        await db.end();
    });
      
})