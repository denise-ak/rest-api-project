import 'dotenv/config'; // first line: loads .env
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Note } from './models/Note.js';

const dbUri = process.env.MONGODB_URI;
//get the port from .env (default 3000)
const port = Number(process.env.PORT) || 3000;
const app = express();

//MIDDLEWARE
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Logger: prints every request
function logger(req, res, next) {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} ${req.method} ${req.path}`);
  next();
}
app.use(logger);

// Rejects ids that are not valid MongoDB ObjectIds -> 400
function validateId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  next();
}

// Validation middleware (slide "Validate before you save"): title is required
function requireTitle(req, res, next) {
  const title = req.body?.title;
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  next();
}

// Keeps only the fields a client is allowed to send (never _id or createdAt)
function pickFields(body = {}) {
  const { title, body: text, tags } = body;
  return { title, body: text, tags };
}

// Mongoose validation errors -> 400, anything else -> 500
function handleDbError(err, res, next) {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

//ROUTES

//READ ALL
app.get('/api/notes', async (req, res) => {
  const search = String(req.query.search ?? '');
  // escape special characters so a search like "(" can't break the regex
  const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = { $regex: safe, $options: 'i' };
  const notes = await Note.find({ title: re }).sort({ createdAt: -1 });
  res.json(notes);
});

//READ ONE
app.get('/api/notes/:id', validateId, async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

//CREATE
app.post('/api/notes', requireTitle, async (req, res, next) => {
  try {
    const note = await Note.create(pickFields(req.body));
    res.status(201).json(note);
  } catch (err) {
    handleDbError(err, res, next);
  }
});

//REPLACE
app.put('/api/notes/:id', validateId, requireTitle, async (req, res, next) => {
  try {
    const { title, body, tags } = pickFields(req.body);
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { title, body: body ?? '', tags: tags ?? [] },
      { returnDocument: 'after', runValidators: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    handleDbError(err, res, next);
  }
});

//UPDATE
app.patch('/api/notes/:id', validateId, async (req, res, next) => {
  try {
    const { title, body, tags } = pickFields(req.body);
    const changes = {};
    if (title !== undefined) changes.title = title;
    if (body !== undefined) changes.body = body;
    if (tags !== undefined) changes.tags = tags;

    const note = await Note.findByIdAndUpdate(req.params.id, changes, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    handleDbError(err, res, next);
  }
});

//DELETE
app.delete('/api/notes/:id', validateId, async (req, res) => {
  const note = await Note.findByIdAndDelete(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.sendStatus(204);
});

//ERRORS
// After all routes: nothing matched -> 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Any other error -> JSON, never a crash
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

//START
try {
  await mongoose.connect(dbUri);
  console.log('connected to MongoDB');
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
} catch (err) {
  console.error('DB connection failed:', err.message);
  process.exit(1);
}