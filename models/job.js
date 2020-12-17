const db = require("../db");
const ExpressError = require("../helpers/expressError");
const sqlForPartialUpdate = require('../helpers/partialUpdate')

class Job {

    // get list of all jobs, ordered by most recent and accepting queries for title search, minimum salary, minimum equity
    static async get(search, minSalary, minEquity) {

        if (!search) {
            search = ''
        }

        const results = await db.query(
            `SELECT id, title, company_handle
            FROM jobs
            WHERE title LIKE $1 AND salary >= $2 AND equity >= $3
            ORDER BY date_posted`,
            [`%${search}%`, minSalary || 0, minEquity || 0]
        )

        return results.rows
    }

    // get single job by id
    static async getOne(id) {
        const result = await db.query(
            `SELECT j.id, j.title, j.salary, j.equity, j.date_posted, c.handle, c.name, c.num_employees, c.description, c.logo_url
            FROM jobs AS j
            INNER JOIN companies AS c
            ON j.company_handle = c.handle
            WHERE j.id = $1`,
            [id]
        )
        return result.rows
    }

    // create new job
    static async create({ title, salary, equity, company_handle }) {
        const result = await db.query(
            `INSERT INTO jobs (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle, date_posted`,
            [title, salary, equity, company_handle]
        )
        return result.rows[0]
    }

    // update a job
    static async update(items, id) {
        for (let key in items) {
            if (key === "id" || key === "date_posted") {
              delete items[key];
            }
          }
        const query = sqlForPartialUpdate('jobs', items, 'id', id)
        const result = await db.query(query.query, query.values)
        return result.rows
    }

    // delete a job
    static async delete (id) {
        const result = await db.query(
            `DELETE FROM jobs
            WHERE id = $1
            RETURNING id`,
            [id]
        )
        return result.rows
    }
    
}

module.exports = Job