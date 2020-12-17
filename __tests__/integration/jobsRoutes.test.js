process.env.NODE_ENV = "test"

const request = require("supertest");
const app = require("../../app");
const db = require("../../db");
const Job = require('../../models/job')
const Company = require('../../models/company')
const User = require('../../models/user')
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../../config')

describe("test jobs routes", () => {
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
            logo_url: "www.test-img.com",
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

    describe("GET /jobs", () => {
        test("return list of jobs", async () => {
            const resp = await request(app).get('/jobs').send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({jobs: [{id: testJob.id, title: "engineer", company_handle: "test"}]})
        });

        test("return list of jobs with search query", async () => {
            const resp = await request(app).get('/jobs').query({search: "engineer"}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({jobs: [{id: testJob.id, title: "engineer", company_handle: "test"}]})
        })

        test("return no matching jobs with search query", async () => {
            const resp = await request(app).get('/jobs').query({search: "bar"}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({jobs: []})
        })

        test("return matching jobs with min_salary query", async () => {
            const resp = await request(app).get('/jobs').query({min_salary: 50000}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({jobs: [{id: testJob.id, title: "engineer", company_handle: "test"}]})
        })

        test("return no matching jobs with min_salary query", async () => {
            const resp = await request(app).get('/jobs').query({min_salary: 110000}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({jobs: []})
        })

        test("return matching jobs with min_equity query", async () => {
            const resp = await request(app).get('/jobs').query({min_equity: .01}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({jobs: [{id: testJob.id, title: "engineer", company_handle: "test"}]})
        })

        test("return no matching jobs with min_equity query", async () => {
            const resp = await request(app).get('/jobs').query({min_equity: .02}).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({jobs: []})
        })
    });

    describe("POST /jobs", () => {
        test("can create new job", async () => {
            const data = {
                title: "new job",
                salary: 50000,
                equity: 0.005,
                company_handle: "test",
                _token: testUserToken
            }
        
            const resp = await request(app).post('/jobs').send(data)

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({job: {
                id: expect.any(Number),
                title: "new job",
                salary: 50000,
                equity: 0.005,
                company_handle: "test",
                date_posted: expect.any(String)
            }})
        })

        test("cannot create new job without valid company_handle", async () => {
            const data = {
                title: "new job",
                salary: 50000,
                equity: 0.005,
                company_handle: "invalid handle",
                _token: testUserToken
            }
            const resp = await request(app).post('/jobs').send(data)

            expect(resp.statusCode).toEqual(400)
        })

        test("cannot create new job with missing data", async () => {
            const data = {
                title: "new job",
                equity: 0.005,
                company_handle: "missing salary",
                _token: testUserToken
            }
            const resp = await request(app).post('/jobs').send(data)

            expect(resp.statusCode).toEqual(400)
        })
    })

    describe("GET /jobs/:id", () => {
        test("get single job", async () => {
            const resp = await request(app).get(`/jobs/${testJob.id}`).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({
                job: {
                    id: testJob.id,
                    title: "engineer",
                    salary: 100000,
                    equity: 0.01,
                    company: {
                        handle: "test",
                        name: "Test Company",
                        num_employees: 10,
                        description: "Testing my routes",
                        logo_url: "www.test-img.com"
                    },
                    date_posted: expect.any(String),
                }})
        })

        test("return 404 if handle not found", async () => {
            const resp = await request(app).get('/jobs/12345').send({_token: testUserToken})

            expect(resp.statusCode).toEqual(404)
        })
    })

    describe("PATCH /jobs/:id", () => {
        test("can update job", async () => {
            const resp = await request(app).patch(`/jobs/${testJob.id}`).send({title: "NEW TITLE", salary: 12345, _token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({
                job: {
                    id: testJob.id,
                    title: "NEW TITLE",
                    salary: 12345,
                    equity: 0.01,
                    company_handle: "test",
                    date_posted: expect.any(String)
                }
            })
        })

        test("cannot update with invalid data", async() => {
            const resp = await request(app).patch(`/jobs/${testJob.id}`).send({salary: "invalid data type", _token: testUserToken})

            expect(resp.statusCode).toEqual(400)
        })

        test("return 404 if handle not found", async () => {
            const resp = await request(app).patch('/jobs/12345').send({title: "new title", _token: testUserToken})

            expect(resp.statusCode).toEqual(404)
        })
    })

    describe("DELETE /jobs", () => {
        test("can delete job", async () => {
            const resp = await request(app).delete(`/jobs/${testJob.id}`).send({_token: testUserToken})

            expect(resp.statusCode).toEqual(200)
            expect(resp.body).toEqual({message: "Job deleted"})
        })
    })


    afterAll(async function () {
        await db.end();
    });
      
})