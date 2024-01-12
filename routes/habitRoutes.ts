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
    const query = `
      SELECT
        habits.id,
        habits.name,
        habits.color,
        array_agg(activity_logs.log_date ORDER BY activity_logs.log_date) as activityLog
      FROM
        habits
      LEFT JOIN
        activity_logs ON habits.id = activity_logs.habit_id
      GROUP BY
        habits.id
      ORDER BY
        habits.id;
    `;

    const { rows } = await pool.query(query);

    const habitsArray = rows.map(habit => ({
      id: habit.id,
      name: habit.name,
      color: habit.color,
      activityLog: habit.activitylog.filter((logDate: Date | null) => logDate !== null)
    }));

    res.json(habitsArray);
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

/** PATCH /api/habits/:id
 *
 * Description:
 *    Updates specific fields of an existing habit.
 *
 * Parameters:
 *    - id: Unique identifier of the habit to update.
 *
 * Request Body:
 *    - Fields that need to be updated (e.g. name, color).
 *    ex. { "name": "Running", "color": "#616f71" }
 *
 * Responses:
 *    - 200 OK: Successful update.
 *    Returns the updated habit object.
 *
 *    - 400 Bad Request: If no fields are provided or the id is not valid.
 *
 *    - 404 Not Found: If no habit with the provided id is found.
 *
 *    - 500 Internal Server Error
*/

router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  const { name, color } = req.body;

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

/** DELETE /api/habits/:id
 *
 * Description:
 *    Deletes an existing habit.
 *
 * Parameters:
 *    - id: Unique identifier of the habit to delete.
 *
 * Responses:
 *    - 200 OK: Successful deletion
 *    Returns a message confirming deletion.
 *
 *    - 400 Bad Request: If the id is not valid.
 *
 *    - 404 Not Found: If no habit with the provided id is found.
 *
 *    - 500 Internal Server Error
*/

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

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