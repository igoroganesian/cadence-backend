import request from 'supertest';
import app from '../src/app';
import db from '../db';
import pool from '../db';
import { Habit } from '../models/Habit';

describe('Habit Routes', () => {
  beforeEach(async () => {
    try {
      const testDb = await db.connect();

      const habitTable = `
        CREATE TABLE IF NOT EXISTS habits (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          color VARCHAR(50)
        );
      `;

      const activityTable = `
        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          habit_id INTEGER NOT NULL,
          log_date DATE NOT NULL,
          FOREIGN KEY (habit_id) REFERENCES habits(id)
      );`;

      await testDb.query(habitTable);
      await testDb.query(activityTable);
      await testDb.release();
    } catch (error) {
      console.error('Error initializing test database:', error);
    }
  });

  describe('GET /api/habits', () => {
    it('should return all habits with activity logs', async () => {
      const response = await request(app).get('/api/habits');
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);

      response.body.forEach((habit: Habit) => {
        expect(habit.activityLog).toBeInstanceOf(Array);
      })
    });
  });

  describe('POST /api/habits', () => {
    it('should create a new habit', async () => {
      const newHabit = {
        name: "Drawing",
        color: "#d6b4fc"
      };

      const response = await request(app)
        .post('/api/habits')
        .send(newHabit);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newHabit.name);
      expect(response.body.color).toBe(newHabit.color);
      expect(response.body.activityLog).toBeInstanceOf(Array);
      expect(response.body.activityLog.length).toBe(0);
    });

    it('should throw a 400 error without a name', async () => {
      const newHabit = {
        color: "#d64bfc"
      };

      const response = await request(app)
        .post('/api/habits')
        .send(newHabit);

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/habit', () => {
    it('should update an existing habit', async () => {
      const habitId = 1;
      const updatedHabit = {
        name: "Coding",
        color: "#d7e2f3"
      };

      const response = await request(app)
        .patch(`/api/habits/${habitId}`)
        .send(updatedHabit);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(updatedHabit.name);
      expect(response.body.color).toBe(updatedHabit.color);
    });

    it('should throw a 400 error if id is not a number', async () => {
      const habitId = 'orange';

      const response = await request(app)
        .delete(`/api/habits/${habitId}`);

      expect(response.statusCode).toBe(400);
    });

    it('should throw a 404 error if habit id not found', async () => {
      const habitId = 999;
      const updatedHabit = {
        name: "Coding",
        color: "#d7e2f3"
      };

      const response = await request(app)
        .patch(`/api/habits/${habitId}`)
        .send(updatedHabit);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/habits/:id', () => {
    it('it should delete an existing habit', async () => {
      const habitId = 1;

      const response = await request(app)
        .delete(`/api/habits/${habitId}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ message: 'Habit deleted successfully' });
    });

    it('should throw a 400 error if id is not a number', async () => {
      const habitId = 'orange';

      const response = await request(app)
        .delete(`/api/habits/${habitId}`);

      expect(response.statusCode).toBe(400);
    });

    it('should throw a 404 error if habit id not found', async () => {
      const habitId = 999;

      const response = await request(app)
        .delete(`/api/habits/${habitId}`);

      expect(response.statusCode).toBe(404);
    });
  });
});

afterAll(async () => {
  try {
    const testDb = await db.connect();
    await testDb.query('DROP TABLE IF EXISTS habits, activity_logs CASCADE');
    await testDb.release();
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }

  await pool.end();
});