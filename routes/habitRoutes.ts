import express from "express";
import pool from "../db";

const router = express.Router();

/** GET /api/habits
 *
 * Description:
 *    Fetches a list of all habits from the database
 *
 * Responses:
 *    - 200 OK: Successful retrieval
 *      Returns an array of habit objects, each containing 'id', 'name', 'color',
 *      and 'activityLog'
 *
 *      ex.
 *      [
 *        {"id": 1, "name": "Drawing", "color": "#FF5733", "activityLog": [] }
 *      ]
 *
 *    - 500 Internal Server Error
 */

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM habits');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: (err as { message: string; }).message });
  }
});

export default router;