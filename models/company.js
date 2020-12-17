// Class for company

const db = require("../db");
const ExpressError = require("../helpers/expressError");
const sqlForPartialUpdate = require('../helpers/partialUpdate')

class Company {

    // get companies from db and allow queries for name search, minimum employees, maximum employees
    static async get (search, min, max) {
        // throw error if min_emp greater than max_emp
        if (+min > +max) {
            throw new ExpressError('Minimum employees cannot be greater than maximum employees', 400)
        }

        // if no search query, set search to empty string
        if (!search) {
            search = ''
        }
        
        // if no min_emp or max_emp queries, leave out range from query so companies with null num_employees will be returned
        if (!min && !max) {
            const results = await db.query(
                `SELECT handle, name
                FROM companies
                WHERE name LIKE $1`,
                [`%${search}%`]
            )
            return results.rows
        }

        // add range to query 
        else {
            const results = await db.query(
                `SELECT handle, name
                FROM companies
                WHERE name LIKE $1 AND (num_employees BETWEEN $2 AND $3)`,
                [`%${search}%`, +min || 0, +max || 100000000]
            )
            return results.rows
        }
                  
    }

    // get single company
    static async getOne (handle) {
        const result = await db.query(
            `SELECT c.handle, c.name, c.num_employees, c.description, c.logo_url, j.id, j.title, j.salary, j.equity, j.date_posted
            FROM companies as c
            INNER JOIN jobs AS j
            ON c.handle = j.company_handle
            WHERE handle = $1`,
            [handle]
        )
        return result.rows
    }

    // create new company
    static async create ({ handle, name, num_employees, description, logo_url }) {
        const result = await db.query(
            `INSERT INTO companies
            VALUES ($1, $2, $3, $4, $5)
            RETURNING handle, name, num_employees, description, logo_url`, 
            [handle, name, num_employees, description, logo_url]
        )
        return result.rows[0]
    }

    // update a company using partial sqlForPartialUpdate
    static async update (items, id) {
        const query = sqlForPartialUpdate('companies', items, 'handle', id)
        const result = await db.query(query.query, query.values)
        return result.rows
    }

    // delete a company
    static async delete (handle) {
        const result = await db.query(
            `DELETE FROM companies
            WHERE handle = $1
            RETURNING handle`,
            [handle]
        )
        return result.rows
    }
}

module.exports = Company