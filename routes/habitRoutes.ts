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
 *    Returns an array of habit objects, each containing 'id', 'name', 'color',
 *    and 'activityLog'
 *
 *    ex.
 *    [
 *      {"id": 1, "name": "Drawing", "color": "#FF5733", "activityLog": [] }
 *    ]
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

/** POST /api/habits
 *
 * Description:
 *    Creates a new habit and inserts it into the database.
 *
 * Request Body:
 *    - name: string - The (name of the) habit.
 *    - color: string - The color for the habit.
 *    ex: { "name": "Drawing", "color": "#d6b4fc" }
 *
 * Responses:
 *    - 201 Created: Successfully created the new habit.
 *    Returns the new habit object, including its id, name, and color
 *    ex. { "id": 1, "name": "Drawing", "color": "#d6b4fc" }
 *
 *    - 400 Bad Request: If 'name' or 'color' are missing in the request body.
 *    Returns a message indicating that both name and color are required.
 *    ex. { "message": "Name and color are required."}
 *
 *    - 500 Internal Server Error
 *    Returns a message describing the error.
 */

router.post('/', async (req, res) => {
  const { name, color } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ message: 'Habit name is required' });
  }

  try {
    const insertQuery = `INSERT INTO habits (name, color)
                         VALUES ($1, $2)
                         RETURNING *`;
    const values = [name, color];

    const { rows } = await pool.query(insertQuery, values);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (typeof (err as { message: unknown; }).message === 'string') {
      console.error('Error:', (err as { message: string; }).message);
      res.status(500).json({ message: (err as { message: string; }).message });
    } else {
      console.error('Unknown Error:', err);
      res.status(500).json({ message: 'An unknown error occured' });
    }
  }
});

/** PATCH */

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;

  //add validation

  try {
    let updateQuery = 'UPDATE habits SET ';
    const updateValues = [];
    if (name !== undefined) {
      updateValues.push(name);
      updateQuery += `name = $${updateValues.length}`;
    }
    if (color !== undefined) {
      if (updateValues.length > 0) updateQuery += ', ';
      updateValues.push(color);
      updateQuery += `color = $${updateValues.length}`;
    }
    updateQuery += ` WHERE id = $${updateValues.length + 1} RETURNING *`;

    if (updateValues.length === 0) {
      return res
        .status(400)
        .json({ message: 'No fields to update were provided' });
    }

    const { rows } = await pool.query(updateQuery, [...updateValues, id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

/** DELETE */

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  // id validation?

  try {
    const deleteQuery = 'DELETE FROM habits WHERE id = $1 RETURNING *';
    const { rows } = await pool.query(deleteQuery, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    res.status(200).json({ message: 'Habit deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;