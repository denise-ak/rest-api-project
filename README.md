# Notes API — Assignment 6

A RESTful API for **notes**, built with **Node.js**, **Express** and **MongoDB** (via Mongoose).
It supports full CRUD: list, get one, create, replace, update and delete.

## Tech stack

- Node.js 20+ and Express 5
- MongoDB Atlas, accessed with Mongoose
- dotenv for environment variables, cors for the front end

## Project structure

```
rest-api-project/
├── models/
│   └── Note.js                          # Mongoose schema and model
├── server.js                            # Express app, middleware and routes
├── .env.example                         # template for .env (no real secrets)
├── .gitignore                           # excludes node_modules and .env
├── notes-api.postman_collection.json    # Postman / Thunder Client tests
├── package.json
└── README.md
```

## Setup

**1. Install the dependencies**

```bash
npm install
```

**2. Create the `.env` file**

Copy the template:

```bash
cp .env.example .env
```

Then open `.env` and replace the placeholders with a real MongoDB connection string:

```
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/rest_api_project
```

- `rest_api_project` at the end is the database name. MongoDB creates it automatically on the first insert.
- On MongoDB Atlas, your IP must be allowed under **Network Access**.
- A local MongoDB also works: `MONGODB_URI=mongodb://127.0.0.1:27017/rest_api_project`

**3. Start the server**

```bash
npm run dev     # restarts on every save
# or
npm start
```

Expected output:

```
connected to MongoDB
Server running on http://localhost:3000
```

If the connection fails, the server prints `DB connection failed: <reason>` and stops.

## Data model

| Field       | Type             | Rules                                      |
|-------------|------------------|--------------------------------------------|
| `_id`       | ObjectId         | set by MongoDB                             |
| `title`     | String           | **required**, trimmed, max 120 characters  |
| `body`      | String           | optional, defaults to `""`                 |
| `tags`      | Array of strings | optional, defaults to `[]`                 |
| `createdAt` | Date             | set by the server                          |
| `updatedAt` | Date             | set by the server                          |

Only `title`, `body` and `tags` are accepted from the client. Any other field (such as `_id` or `createdAt`) is ignored.

## Routes

Base URL: `http://localhost:3000/api`

| Method | Path          | Description                      | Success | Errors    |
|--------|---------------|----------------------------------|---------|-----------|
| GET    | `/notes`      | List all notes (optional search) | 200     | —         |
| GET    | `/notes/:id`  | Get one note                     | 200     | 400, 404  |
| POST   | `/notes`      | Create a note                    | 201     | 400       |
| PUT    | `/notes/:id`  | Replace a note                   | 200     | 400, 404  |
| PATCH  | `/notes/:id`  | Update only the fields sent      | 200     | 400, 404  |
| DELETE | `/notes/:id`  | Delete a note                    | 204     | 400, 404  |

All errors are returned as JSON: `{ "error": "message" }`.

---

### GET /api/notes

Returns every note, newest first.

Optional query: `?search=<text>` keeps only notes whose title contains the text (case-insensitive).

```bash
curl -i "localhost:3000/api/notes?search=exam"
```

**Response — 200 OK**

```json
[
  {
    "_id": "6af180010407c6572b7e7b81",
    "title": "Exam topics",
    "body": "Hooks, Express, REST",
    "tags": ["exam", "week9"],
    "createdAt": "2026-11-09T08:10:41.732Z",
    "updatedAt": "2026-11-09T08:10:41.732Z",
    "__v": 0
  }
]
```

---

### GET /api/notes/:id

```bash
curl -i localhost:3000/api/notes/6af180010407c6572b7e7b81
```

**Response — 200 OK**

```json
{
  "_id": "6af180010407c6572b7e7b81",
  "title": "Exam topics",
  "body": "Hooks, Express, REST",
  "tags": ["exam", "week9"],
  "createdAt": "2026-11-09T08:10:41.732Z",
  "updatedAt": "2026-11-09T08:10:41.732Z",
  "__v": 0
}
```

**Errors**

| Case                          | Status | Body                            |
|-------------------------------|--------|---------------------------------|
| id is not a valid ObjectId    | 400    | `{ "error": "Invalid id" }`     |
| no note with this id          | 404    | `{ "error": "Note not found" }` |

---

### POST /api/notes

**Request body**

```json
{
  "title": "Exam topics",
  "body": "Hooks, Express, REST",
  "tags": ["exam", "week9"]
}
```

```bash
curl -i -X POST localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Exam topics","body":"Hooks, Express, REST","tags":["exam","week9"]}'
```

**Response — 201 Created**

```json
{
  "title": "Exam topics",
  "body": "Hooks, Express, REST",
  "tags": ["exam", "week9"],
  "_id": "6af180010407c6572b7e7b81",
  "createdAt": "2026-11-09T08:10:41.732Z",
  "updatedAt": "2026-11-09T08:10:41.732Z",
  "__v": 0
}
```

**Errors**

| Case                                  | Status | Body                                       |
|---------------------------------------|--------|--------------------------------------------|
| `title` missing, empty or not a string | 400    | `{ "error": "title is required" }`         |
| `title` longer than 120 characters    | 400    | `{ "error": "Note validation failed: ..." }` |
| body is not valid JSON                | 400    | `{ "error": "Malformed JSON body" }`       |

---

### PUT /api/notes/:id

Replaces the whole note. `title` is required. Fields you leave out go back to their defaults (`body` → `""`, `tags` → `[]`).

**Request body**

```json
{
  "title": "Final exam plan",
  "body": "Revise sessions 16 to 18"
}
```

```bash
curl -i -X PUT localhost:3000/api/notes/6af180010407c6572b7e7b81 \
  -H "Content-Type: application/json" \
  -d '{"title":"Final exam plan","body":"Revise sessions 16 to 18"}'
```

**Response — 200 OK**

```json
{
  "_id": "6af180010407c6572b7e7b81",
  "title": "Final exam plan",
  "body": "Revise sessions 16 to 18",
  "tags": [],
  "createdAt": "2026-11-09T08:10:41.732Z",
  "updatedAt": "2026-11-09T08:12:05.118Z",
  "__v": 0
}
```

**Errors:** 400 `Invalid id`, 400 `title is required`, 400 validation error, 404 `Note not found`.

---

### PATCH /api/notes/:id

Changes only the fields you send and leaves the others alone.

**Request body**

```json
{
  "title": "Exam topics v2"
}
```

```bash
curl -i -X PATCH localhost:3000/api/notes/6af180010407c6572b7e7b81 \
  -H "Content-Type: application/json" \
  -d '{"title":"Exam topics v2"}'
```

**Response — 200 OK** (the body and tags are unchanged)

```json
{
  "_id": "6af180010407c6572b7e7b81",
  "title": "Exam topics v2",
  "body": "Hooks, Express, REST",
  "tags": ["exam", "week9"],
  "createdAt": "2026-11-09T08:10:41.732Z",
  "updatedAt": "2026-11-09T08:11:30.247Z",
  "__v": 0
}
```

**Errors:** 400 `Invalid id`, 400 if `title` is sent empty or `null`, 404 `Note not found`.

---

### DELETE /api/notes/:id

```bash
curl -i -X DELETE localhost:3000/api/notes/6af180010407c6572b7e7b81
```

**Response — 204 No Content** (no body)

Running it a second time returns **404** `{ "error": "Note not found" }`.

---

### Any other route

```bash
curl -i localhost:3000/api/nothing-here
```

**Response — 404 Not Found**

```json
{ "error": "Route not found" }
```

## Error handling

- Invalid input returns **400** with a JSON message. The server never crashes on bad input.
- A valid id that matches no note returns **404**.
- Unexpected server errors return **500** `{ "error": "Internal server error" }` and are logged in the terminal.
- If MongoDB is unreachable at startup, the server prints a clear message and exits.

## Testing

### Postman / Thunder Client

1. Start the server (`npm run dev`).
2. Import `notes-api.postman_collection.json` into Postman or Thunder Client.
3. Run the collection in order. Request 1 creates a note and saves its id in the `noteId` variable, which the later requests use.

The collection has **16 requests and 34 checks**: every route, plus the 400 and 404 cases.

### Command line

The same collection can be run from the terminal with Newman:

```bash
npx newman run notes-api.postman_collection.json
```
