// Companies routes

const express = require('express')
const router = new express.Router()
const ExpressError = require("../helpers/expressError");
const Company = require('../models/company')
const { ensureLoggedIn, ensureIsAdmin } = require('../middleware/auth')

const jsonschema = require('jsonschema')
const companiesPostSchema = require('../schemas/companies-post-schema.json')
const companiesPatchSchema = require('../schemas/companies-patch-schema.json')

// Get all companies and accept queries for search, min_employees, max_employees
router.get('/', ensureLoggedIn, async (req, res, next) => {
    try {
        const { search, min_emp, max_emp } = req.query
        const results = await Company.get(search, min_emp, max_emp)
        return res.json({companies: results})
    } catch (e) {
        return next(e)
    }
})

// Create new company
router.post('/', ensureIsAdmin, async (req, res, next) => {
    try {
        const validate = jsonschema.validate(req.body, companiesPostSchema)

        if (!validate.valid) {
        let listOfErrors = validate.errors.map(e => e.stack)
        let error = new ExpressError(listOfErrors, 400)
        return next(error)
        }

        const result = await Company.create(req.body)
        return res.json({company: result})
    } catch (e) {
        console.log(e)
        if (e.code === '23505') {
            return next (new ExpressError('Handle already exists', 400))
        }
        return next(e)
    }
})

// get single company by handle
router.get('/:handle', ensureLoggedIn, async (req, res, next) => {
    try {
        const { handle } = req.params
        const result = await Company.getOne(handle)
        if (result.length === 0) {
            return next()
        }
        
        const r = result[0]
        // create new array from query results that consists of all the job data associated with company
        const jobs = result.map(r => { 
            return {id: r.id, title: r.title, salary: r.salary, equity: r.equity, date_posted: r.date_posted} 
        })
        
        return res.json({
            company: {
                handle: r.handle,
                name: r.name,
                num_employees: r.num_employees,
                description: r.description,
                logo_url: r.logo_url,
                jobs: jobs
            }})
    } catch (e) {
        return next(e)
    }
})

// update company
router.patch('/:handle', ensureIsAdmin, async (req, res, next) => {
    try {
        const validate = jsonschema.validate(req.body, companiesPatchSchema)

        if(!validate.valid) {
        let listOfErrors = validate.errors.map(e => e.stack)
        let error = new ExpressError(listOfErrors, 400)
        return next(error)
        }

        const { handle } = req.params
        const result = await Company.update(req.body, handle)
        if (result.length === 0) {
            return next()
        }
        return res.json({company: result[0]})
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

// delete a company
router.delete('/:handle', ensureIsAdmin, async (req, res, next) => {
    try {
        const { handle } = req.params
        const result = await Company.delete(handle)
        if (result.length === 0) {
            return next()
        }
        return res.json({message: 'Company deleted'})
    } catch (e) {
        return next(e)
    }
})



module.exports = router