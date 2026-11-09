# MiChat

Responsive web-first end-to-end encrypted messaging application.

## Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Python, FastAPI, WebSockets
- Database: MySQL / InnoDB
- Database access: supplied asynchronous `aiomysql` layer at
  `backend/app/db.py`

## Local setup

1. Create and activate a Python virtual environment.
2. Install backend dependencies:

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` in the repository root and set database
   credentials. The database module reads environment variables; load `.env`
   in your shell/process manager before starting the API.
4. Create a dedicated MySQL application user and database.
5. Review and import the `michat.sql` schema into the `michat` database.
6. Start the API from the `backend` directory:

   ```bash
   uvicorn app.main:app --reload
   ```

7. Check `http://127.0.0.1:8000/health`.

## Database helper

Import the shared database object with:

```python
from app.db import db

user = await db.fetch_one(
    "SELECT id, account_status FROM users WHERE id = %s",
    (user_id,),
)
```

Available methods include `fetch_one`, `fetch_all`, `execute`,
`execute_many`, `transaction` and `run_transaction`. Always use parameterized
queries. Use a transaction for multi-step operations.

## Important

The supplied `db.py` is included as the project's database-access layer.
Before production, review its automatic retry behavior for write operations:
a connection failure after a server-side commit can make blindly retrying a
non-idempotent write unsafe. Use idempotency keys/unique constraints or
transaction-specific retry logic where required.

The SQL dump and roadmap should be reviewed together before production schema
deployment.
