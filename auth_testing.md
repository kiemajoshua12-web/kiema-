# KIEMA Auth Testing Playbook

## Setup test user & session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Test backend
```bash
curl -X GET "$REACT_APP_BACKEND_URL/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

curl -X GET "$REACT_APP_BACKEND_URL/api/generations" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Browser session injection
```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "motion-magic-studio.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
```

## Cleanup
```bash
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\\.user\\./});
db.user_sessions.deleteMany({session_token: /test_session/});
"
```
