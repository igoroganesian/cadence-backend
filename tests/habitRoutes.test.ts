import request from 'supertest';
import app from '../src/app';
import db from '../db';

describe('Habit Routes', () => {
  beforeEach(async () => {
    try {
      const testDb = await db.connect();

      const createTable = `
        CREATE TABLE IF NOT EXISTS habits (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          color VARCHAR(50)
        );
      `;

      await testDb.query(createTable);
      await testDb.release();
    } catch (error) {
      console.error('Error initializing test database:', error);
    }
  });

  describe('GET /api/habits', () => {
    it('should return all habits', async () => {
      const response = await request(app).get('/api/habits');
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
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
    });

  })


});

afterAll(async () => {
  try {
    const testDb = await db.connect();
    await testDb.query('DROP TABLE IF EXISTS lessons CASCADE');
    await testDb.release();
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
});