import express from 'express';
import cors from 'cors';
import habitRoutes from '../routes/habitRoutes';

const app = express();

app.use(express.json());
app.use(cors());
app.use('/api/habits', habitRoutes);

app.get('/', (req, res) => {
  res.send('Cadence');
});

export default app;