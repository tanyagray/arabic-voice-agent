# Web API Tests

This directory contains unit and integration tests for the Arabic Voice Agent web API.

## Setup

Install test dependencies:

```bash
pip install -e ".[test]"
```

## Running Tests

### Using Task

Run all tests:
```bash
task test
```

Run tests in watch mode (auto-rerun on file changes):
```bash
task test:watch
```

### Using pytest directly

Run all tests:
```bash
pytest
```

Run specific test file:
```bash
pytest tests/test_routes/test_session.py
```

Run specific test class:
```bash
pytest tests/test_routes/test_session.py::TestCreateSession
```

Run specific test method:
```bash
pytest tests/test_routes/test_session.py::TestCreateSession::test_create_session_success
```

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures and test configuration
├── test_routes/             # API route tests
│   └── test_session.py      # Session management endpoints
├── test_services/           # Service layer tests
│   └── test_content_service.py
└── test_agent/              # Agent logic tests
```

## Writing Tests

### Route Tests

Route tests use FastAPI's `TestClient` to simulate HTTP requests:

```python
def test_my_endpoint(client):
    response = client.get("/endpoint")
    assert response.status_code == 200
```

### Service Tests

Service tests mock external dependencies:

```python
@patch("services.my_service.external_api")
def test_my_service(mock_api):
    mock_api.return_value = "data"
    result = my_service.process()
    assert result == "processed data"
```

### Async Tests

Use `pytest-asyncio` for async tests:

```python
@pytest.mark.asyncio
async def test_async_function():
    result = await my_async_function()
    assert result is not None
```

## Fixtures

Common fixtures are defined in `conftest.py`:

- `client`: FastAPI TestClient
- `test_env`: Test environment variables
- `mock_supabase_client`: Mocked Supabase client
- `mock_agent_session`: Mocked agent session
- `sample_user_id`: Test user ID
- `sample_session_id`: Test session ID

## Best Practices

1. **Isolate tests**: Each test should be independent
2. **Mock external services**: Don't call real APIs (Supabase, OpenAI, etc.)
3. **Use fixtures**: Reuse common setup via fixtures
4. **Test edge cases**: Test both success and failure scenarios
5. **Clear naming**: Use descriptive test names that explain what's being tested
6. **Arrange-Act-Assert**: Structure tests with clear AAA pattern
