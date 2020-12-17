// Jobs routes

const express = require('express')
const router = new express.Router()
const ExpressError = require("../helpers/expressError")
const Job = require('../models/job')
const { ensureLoggedIn, ensureIsAdmin } = require('../middleware/auth')

const jsonschema = require('jsonschema')
const jobsPostSchema = require('../schemas/jobs-post-schema.json')
const jobsPatchSchema = require('../schemas/jobs-patch-schema.json')

// get all jobs and accept queries for title search, min_salary, min_equity
router.get('/', ensureLoggedIn, async (req, res, next) => {
    try {
        const { search, min_salary, min_equity } = req.query
        const results = await Job.get(search, min_salary, min_equity)
        return res.json({jobs: results})
    } catch (e) {
        return next (e)
    }
})

// create new job
router.post('/', ensureIsAdmin, async(req, res, next) => {
    try {
        const validate = jsonschema.validate(req.body, jobsPostSchema)

        if (!validate.valid) {
        let listOfErrors = validate.errors.map(e => e.stack)
        let error = new ExpressError(listOfErrors, 400)
        return next(error)
        }

        const result = await Job.create(req.body)
        return res.json({job: result})
    } catch (e) {
        if (e.code === '23503') {
            return next(new ExpressError('Invalid company_handle', 400))
        }
        return next(e)
    }
})

// get single job by id
router.get('/:id', ensureLoggedIn, async (req, res, next) => {
    try {
        const { id } = req.params
        const result = await Job.getOne(id)

        if (result.length === 0) {
            return next()
        }

        const r = result[0]
        return res.json({job: {
            id: r.id,
            title: r.title,
            salary: r.salary,
            equity: r.equity,
            company: {
                handle: r.handle,
                name: r.name,
                num_employees: r.num_employees,
                description: r.description,
                logo_url: r.logo_url,
            },
            date_posted: r.date_posted
        }})
    } catch (e) {
        return next(e)
    }
})

// update job
router.patch('/:id', ensureIsAdmin, async(req, res, next) => {
    try {
        const validate = jsonschema.validate(req.body, jobsPatchSchema)

        if (!validate.valid) {
        let listOfErrors = validate.errors.map(e => e.stack)
        let error = new ExpressError(listOfErrors, 400)
        return next(error)
        }

        const { id } = req.params
        const result = await Job.update(req.body, id)
        if (result.length === 0) {
            return next()
        }

        return res.json({job: result[0]})
    } catch (e) {
        if (e.code === '42601') {
            return next(new ExpressError('Missing data', 400))
        }
        if (e.code === '42703') {
            return next(new ExpressError('Invalid key', 400))
        }
        return next(e)
    }
})

// delete a job
router.delete('/:id', ensureIsAdmin, async (req, res, next) => {
    try {
        const { id } = req.params
        const result = await Job.delete(id)
        if (result.length === 0) {
            return next()
        }
        return res.json({message: 'Job deleted'})
    } catch (e) {
        return next(e)
    }
})

module.exports = router