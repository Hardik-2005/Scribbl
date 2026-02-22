# Postman WebSocket Testing Guide

This guide shows how to test the Scribble Game Backend using Postman's WebSocket feature.

## Setup

1. Open Postman
2. Click "New" → "WebSocket Request"
3. Enter URL: `ws://localhost:3000`
4. Click "Connect"

## Testing Flow

### 1. Create a Room

**Event:** `create_room`

**Message:**
```json
{
  "event": "create_room",
  "data": {
    "roomId": "test-room-123"
  }
}
```

**Expected Response:**
```json
{
  "event": "room_created",
  "data": {
    "success": true,
    "roomId": "test-room-123",
    "message": "Room created successfully"
  }
}
```

### 2. Join the Room

**Event:** `join_room`

**Message:**
```json
{
  "event": "join_room",
  "data": {
    "roomId": "test-room-123",
    "username": "TestPlayer1"
  }
}
```

**Expected Responses:**
1. `room_joined` event:
```json
{
  "event": "room_joined",
  "data": {
    "success": true,
    "roomId": "test-room-123",
    "userId": "generated-uuid-here",
    "username": "TestPlayer1",
    "message": "Joined room successfully"
  }
}
```

2. `player_list_update` event:
```json
{
  "event": "player_list_update",
  "data": {
    "roomId": "test-room-123",
    "players": [
      {
        "userId": "generated-uuid-here",
        "username": "TestPlayer1",
        "isConnected": true,
        "score": 0
      }
    ]
  }
}
```

**⚠️ Important:** Save the `userId` from the response - you'll need it for reconnection!

### 3. Send a Message

**Event:** `send_message`

**Message:**
```json
{
  "event": "send_message",
  "data": {
    "roomId": "test-room-123",
    "message": "Hello from Postman!"
  }
}
```

**Expected Response:**
```json
{
  "event": "receive_message",
  "data": {
    "roomId": "test-room-123",
    "userId": "your-user-id",
    "username": "TestPlayer1",
    "message": "Hello from Postman!",
    "timestamp": 1645564800000
  }
}
```

### 4. Test Disconnection

1. Click "Disconnect" in Postman
2. The server will emit to other clients:
```json
{
  "event": "player_disconnected",
  "data": {
    "roomId": "test-room-123",
    "userId": "your-user-id",
    "username": "TestPlayer1",
    "timestamp": 1645564800000
  }
}
```

### 5. Test Reconnection

1. Click "Connect" again
2. Send reconnect event with your saved userId:

**Event:** `reconnect_player`

**Message:**
```json
{
  "event": "reconnect_player",
  "data": {
    "roomId": "test-room-123",
    "userId": "your-saved-user-id-here"
  }
}
```

**Expected Responses:**
1. `room_joined` event with your original data
2. `player_reconnected` broadcast to all players
3. `player_list_update` with updated connection status

## Multi-Client Testing

To test real multiplayer scenarios:

1. Open multiple Postman WebSocket tabs
2. Create room in Tab 1
3. Join same room from Tab 2 and Tab 3
4. Send messages from different tabs
5. Observe broadcasts

## Error Testing

### Invalid Room
```json
{
  "event": "join_room",
  "data": {
    "roomId": "nonexistent-room",
    "username": "Player1"
  }
}
```

**Expected Response:**
```json
{
  "event": "room_error",
  "data": {
    "success": false,
    "error": "Room does not exist"
  }
}
```

### Duplicate Username
```json
{
  "event": "join_room",
  "data": {
    "roomId": "test-room-123",
    "username": "TestPlayer1"
  }
}
```
(when TestPlayer1 already exists)

**Expected Response:**
```json
{
  "event": "room_error",
  "data": {
    "success": false,
    "error": "Username already taken in this room"
  }
}
```

## Quick Test Sequence

Copy-paste these in order (replace placeholders):

```json
// 1. Create room
{"event":"create_room","data":{"roomId":"quick-test"}}

// 2. Join room
{"event":"join_room","data":{"roomId":"quick-test","username":"Tester"}}

// 3. Send message
{"event":"send_message","data":{"roomId":"quick-test","message":"Test message"}}

// 4. Disconnect and reconnect with saved userId
{"event":"reconnect_player","data":{"roomId":"quick-test","userId":"PASTE-YOUR-USER-ID-HERE"}}
```

## Event Format

All Socket.IO events in this project follow standard socket.io event format:

```javascript
socket.emit('event_name', payload, optional_callback);
```

In Postman, the format differs slightly - check Socket.IO compatibility mode in Postman settings.

## Debugging Tips

1. **Check server logs** - The backend logs all important events
2. **Use REST API** - Check `/api/stats` to see all rooms and players
3. **Save userIds** - Always save the userId from join_room response
4. **One room at a time** - Test one complete flow before creating multiple rooms

## Common Issues

### Connection Fails
- Ensure server is running on port 3000
- Check if localhost:3000 is accessible
- Try `http://localhost:3000` in browser first

### Events Not Received
- Verify you're in the correct room
- Check you sent join_room before other events
- Ensure JSON syntax is correct

### Reconnection Fails
- Save userId immediately after joining
- Ensure room still exists (wasn't cleaned up)
- Check userId format (should be UUID)

## Next Steps

After testing in Postman, try:
1. Using the HTML test client at http://localhost:3000
2. Building a real frontend client
3. Testing with multiple concurrent users
