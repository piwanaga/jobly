process.env.NODE_ENV = "test"

const request = require("supertest");
const app = require("../../app");
const db = require("../../db");
const Company = require('../../models/company')
const Job = require('../../models/job')
const User = require('../../models/user')
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../../config')

describe("test companies routes", () => {
    let testCo
    let testJob
    let testUser
    let testUserToken

    // create test company, job, user
    beforeEach(async function () {
        await db.query("DELETE FROM companies");
        await db.query("DELETE FROM jobs");
        await db.query("DELETE FROM users");

        testCo = await Company.create({
            handle: "test",
            name: "Test Company",
            num_employees: 10,
            description: "Testing my routes",
            logo_url: "www.test-img.com"
        });

        testJob = await Job.create({
            title: "engineer",
            salary: 100000,
            equity: 0.01,
            company_handle: "test"
        });

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

    describe("GET /companies", () => {
        test("return list of companies", async () => {
            const resp = await request(app).get('/companies').send({_token: testUserToken})
        
            console.log(testCo, testJob, testUser)

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({companies: [{handle: "test", name: "Test Company"}]})
        });

        test("return list of companies with search query", async () => {
            const resp = await request(app).get('/companies').query({search: "T"}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({companies: [{handle: "test", name: "Test Company"}]})
        })

        test("return no matching companies with search query", async () => {
            const resp = await request(app).get('/companies').query({search: "P"}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({companies: []})
        })

        test("return matching companies with min_emp query", async () => {
            const resp = await request(app).get('/companies').query({min_emp: 5}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({companies: [{handle: "test", name: "Test Company"}]})
        })

        test("return no matching companies with min_emp query", async () => {
            const resp = await request(app).get('/companies').query({min_emp: 11}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({companies: []})
        })

        test("return matching companies with max_emp query", async () => {
            const resp = await request(app).get('/companies').query({max_emp: 10}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({companies: [{handle: "test", name: "Test Company"}]})
        })

        test("return no matching companies with max_emp query", async () => {
            const resp = await request(app).get('/companies').query({max_emp: 9}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({companies: []})
        })

        test("return 400 error when min_emp is greater than max_emp", async () => {
            const resp = await request(app).get('/companies').query({min_emp: 2, max_emp: 1}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(400)
        })
    });

    describe("POST /companies", () => {
        test("can create new company", async () => {
            const data = {
                handle: "new",
                name: "New Company",
                num_employees: 5,
                description: "My new company",
                _token: testUserToken
            }
            const resp = await request(app).post('/companies').send(data)

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({company: {
                handle: "new",
                name: "New Company",
                num_employees: 5,
                description: "My new company",
                logo_url: null
            }})
        })

        test("cannot create new company with existing handle", async () => {
            const data = {
                handle: "test",
                name: "New Company",
                _token: testUserToken
            }
            const resp = await request(app).post('/companies').send(data)

            expect(resp.statusCode).toEqual(400)
        })

        test("cannot create new company with missing data", async () => {
            const data = {
                handle: "missing name",
                _token: testUserToken
            }
            const resp = await request(app).post('/companies').send(data)

            expect(resp.statusCode).toEqual(400)
        })
    })

    describe("GET /companies/:handle", () => {
        test("get single company", async () => {
            const resp = await request(app).get(`/companies/${testCo.handle}`).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({
                company: {
                    handle: "test",
                    name: "Test Company",
                    num_employees: 10,
                    description: "Testing my routes",
                    logo_url: "www.test-img.com",
                    jobs: [
                        {
                            id: testJob.id,
                            title: "engineer",
                            salary: 100000,
                            equity: 0.01,
                            date_posted: expect.any(String)
                        }
                    ]
                }})
        })

        test("return 404 if handle not found", async () => {
            const resp = await request(app).get('/companies/invalidhandle').send({_token: testUserToken})

            expect(resp.statusCode).toEqual(404)
        })
    })

    describe("PATCH /companies/:handle", () => {
        test("can update company", async () => {
            const resp = await request(app).patch(`/companies/${testCo.handle}`).send({
                name: "NEW NAME",
                num_employees: 100,
                _token: testUserToken
            })

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({
                company: {
                    handle: "test",
                    name: "NEW NAME",
                    num_employees: 100,
                    description: "Testing my routes",
                    logo_url: "www.test-img.com"
                }
            })
        })

        test("cannot update with invalid data", async() => {
            const resp = await request(app).patch(`/companies/${testCo.handle}`).send({description: false, _token: testUserToken})

            expect(resp.statusCode).toEqual(400)
        })

        test("return 404 if handle not found", async () => {
            const resp = await request(app).patch('/companies/invalidhandle').send({name: "new name", _token: testUserToken})

            expect(resp.statusCode).toEqual(404)
        })
    })

    describe("DELETE /companies", () => {
        test("can delete company", async () => {
            const resp = await request(app).delete(`/companies/${testCo.handle}`).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({message: "Company deleted"})
        })
    })


    afterAll(async function () {
        await db.end();
    });
      
})