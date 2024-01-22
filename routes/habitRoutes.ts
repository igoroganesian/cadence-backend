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
 *    - name: string - The habit name.
 *    - color: string - The habit display color.
 *    ex: { "name": "Drawing", "color": "#d6b4fc" }
 *
 * Responses:
 *    - 201 Created: Successfully created the new habit.
 *    Returns the new habit object, including its id, name, color, and empty activityLog
 *    ex. { "id": 1, "name": "Drawing", "color": "#d6b4fc", "activityLog": [] }
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
    const newHabit = rows[0];
    newHabit.activityLog = [];

    res.status(201).json(newHabit);
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
    updateQuery += ` WHERE id = $${updateValues.length + 1}`;

    if (updateValues.length === 0) {
      return res
        .status(400)
        .json({ message: 'No fields to update were provided' });
    }

    await pool.query(updateQuery, [...updateValues, id]);

    const updatedHabitQuery = `
      SELECT habits.*, array_agg(activity_logs.log_date ORDER BY activity_logs.log_date) AS "activityLog"
      FROM habits
      LEFT JOIN activity_logs ON habits.id = activity_logs.habit_id
      WHERE habits.id = $1
      GROUP BY habits.id
    `;

    const habitResult = await pool.query(updatedHabitQuery, [id]);

    if (habitResult.rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    const updatedHabit = habitResult.rows[0];
    console.log(updatedHabit);

    updatedHabit.activityLog = updatedHabit.activityLog.filter((logDate: Date | null) => logDate !== null);

    res.status(200).json(updatedHabit);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

/** PATCH /api/habits/:id/activity
 *
 * Description:
 *    Updates activityLog of an existing habit.
 *
 * Parameters:
 *    - id: Unique identifier of the habit to update.
 *
 * //TODO: CORRECT BELOW
 * Request Body:
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

router.patch('/:id/activity', async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  const { activityData } = req.body;

  console.log(req.body);

  try {
    await pool.query('BEGIN');

    console.log(`Deleting existing logs for habit id: ${id}`);
    const deleteResult = await pool.query('DELETE FROM activity_logs WHERE habit_id = $1', [id]);
    console.log(`Deleted ${deleteResult.rowCount} rows.`);

    const insertPromises = activityData.map((logDate: Date) =>
      pool.query('INSERT INTO activity_logs (habit_id, log_date) VALUES ($1, $2)', [id, logDate])
    );
    await Promise.all(insertPromises);

    await pool.query('COMMIT');

    const updatedHabitQuery = `
            SELECT habits.*, array_agg(activity_logs.log_date ORDER BY activity_logs.log_date) AS "activityLog"
            FROM habits
            LEFT JOIN activity_logs ON habits.id = activity_logs.habit_id
            WHERE habits.id = $1
            GROUP BY habits.id
        `;

    const habitResult = await pool.query(updatedHabitQuery, [id]);

    if (habitResult.rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found' });
    }

    const updatedHabit = habitResult.rows[0];

    if (updatedHabit.activityLog) {
      updatedHabit.activityLog = updatedHabit.activityLog.map((logDate: Date) =>
        logDate.toISOString().split('T')[0]
      );
    }

    res.status(200).json(updatedHabit);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error updating activity log:', err);
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