# 🎮 Scribble Game Backend - Phase 1 & 2

A real-time multiplayer drawing game backend built with Node.js, Express, and Socket.IO. 

**Phase 1:** WebSocket foundations, room management, and real-time communication  
**Phase 2:** Game engine, round lifecycle, guess validation, and scoring

## 📋 Features

### Phase 1 Features ✅
- Reliable Socket.IO connections with fallback transports
- Connection/disconnection lifecycle management
- Error handling and logging

✅ **Room Management**
- Create and join rooms
- In-memory room state management
- Automatic cleanup of empty rooms

✅ **Player Management**
- Unique user ID generation (UUID)
- Player state tracking (connected/disconnected)
- Username validation and duplicate prevention

✅ **Reconnection Handling**
- Basic reconnection support
- Session persistence via userId
- Automatic socket ID reassignment

✅ **Real-time Broadcasting**
- Room-based message broadcasting
- Player list updates
- Connection status notifications

✅ **Clean Architecture**
- Modular folder structure
- Separation of concerns
- Testable and extendable design

### Phase 2 Features ✅

**🎮 Game Engine**
- Game state management (waiting/playing/round_end)
- Round lifecycle with automatic progression
- Clean separation of game logic from socket handling

**🎯 Round Management**
- Drawer selection (round-robin rotation through players)
- Word selection from 50-word list
- 60-second server-authoritative timer
- Automatic round transitions with 5-second delay

**✅ Guess Validation**
- Case-insensitive guess matching
- Prevent drawer from guessing
- Prevent duplicate guesses per round
- Real-time feedback on correct/incorrect guesses

**🏆 Scoring System**
- +10 points per correct guess
- Score persistence across rounds
- Real-time score updates and broadcasting

**🛡️ Edge Case Handling**
- Drawer disconnect → immediate round end
- Insufficient players (<2) → game stops
- All players guessed → early round end
- Timer cleanup on room deletion

**📡 Game Events**
- `start_game`, `submit_guess` (client → server)
- `game_started`, `round_started`, `round_ended` (server → client)
- `round_timer_update` (every second)
- `correct_guess`, `word_reveal`, `word_hint`

## 📁 Project Structure

```
/Scribble
  /src
    server.js              # Main Express + Socket.IO server
    /config
      socket.js            # Socket.IO configuration
    /rooms
      roomManager.js       # In-memory room state manager
    /sockets
      socketHandler.js     # Socket event handlers
    /game                  # Phase 2: Game logic
      gameEngine.js        # Game state & round lifecycle
      wordService.js       # Word selection & validation
    /utils
      idGenerator.js       # UUID generation utilities
  /public
    index.html             # HTML test client
  package.json             # Dependencies and scripts
  README.md               # This file
  PHASE2_TESTING.md       # Phase 2 testing guide
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

1. **Install dependencies:**

```powershell
npm install
```

2. **Start the server:**

```powershell
npm start
```

For development with auto-reload (Node 18+):

```powershell
npm run dev
```

### Server will be running at:
- **HTTP Server:** http://localhost:3000
- **WebSocket Server:** ws://localhost:3000
- **Test Client:** http://localhost:3000

## 🧪 Testing

### Option 1: HTML Test Client (Recommended)

1. Start the server: `npm start`
2. Open browser: http://localhost:3000
3. Use the web interface to:
   - Connect to server
   - Create/join rooms
   - Send messages
   - See player list updates
   - Test reconnection

### Option 2: Postman WebSocket

1. Open Postman
2. Create new WebSocket request
3. Connect to: `ws://localhost:3000`
4. Send events (see Event Reference below)

## 📡 Socket Events Reference

### Client → Server

#### `create_room`
Creates a new room.

```javascript
socket.emit('create_room', {
  roomId: 'game-123'
}, (response) => {
  // response: { success: true, roomId: 'game-123', message: '...' }
});
```

#### `join_room`
Joins an existing room.

```javascript
socket.emit('join_room', {
  roomId: 'game-123',
  username: 'Player1'
}, (response) => {
  // response: { success: true, roomId: '...', userId: '...', username: '...' }
});
```

#### `send_message`
Sends a message to all players in the room.

```javascript
socket.emit('send_message', {
  roomId: 'game-123',
  message: 'Hello everyone!'
}, (response) => {
  // response: { success: true }
});
```

#### `reconnect_player`
Reconnects a previously disconnected player.

```javascript
socket.emit('reconnect_player', {
  roomId: 'game-123',
  userId: 'previously-assigned-uuid'
}, (response) => {
  // response: { success: true, roomId: '...', userId: '...', username: '...' }
});
```

### Server → Client

#### `room_created`
Fired when a room is successfully created.

```javascript
socket.on('room_created', (data) => {
  // data: { success: true, roomId: '...', message: '...' }
});
```

#### `room_joined`
Fired when successfully joined a room.

```javascript
socket.on('room_joined', (data) => {
  // data: { success: true, roomId: '...', userId: '...', username: '...' }
});
```

#### `room_error`
Fired when a room operation fails.

```javascript
socket.on('room_error', (data) => {
  // data: { success: false, error: 'error message' }
});
```

#### `receive_message`
Fired when a message is broadcast in the room.

```javascript
socket.on('receive_message', (data) => {
  // data: { roomId: '...', userId: '...', username: '...', message: '...', timestamp: 123456 }
});
```

#### `player_list_update`
Fired when the player list changes (join/disconnect/reconnect).

```javascript
socket.on('player_list_update', (data) => {
  // data: {
  //   roomId: '...',
  //   players: [
  //     { userId: '...', username: '...', isConnected: true, score: 0 },
  //     ...
  //   ]
  // }
});
```

#### `player_disconnected`
Fired when a player disconnects.

```javascript
socket.on('player_disconnected', (data) => {
  // data: { roomId: '...', userId: '...', username: '...', timestamp: 123456 }
});
```

#### `player_reconnected`
Fired when a player reconnects.

```javascript
socket.on('player_reconnected', (data) => {
  // data: { roomId: '...', userId: '...', username: '...', timestamp: 123456 }
});
```

## 🔌 REST API Endpoints

### `GET /health`
Health check endpoint.

```powershell
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1645564800000,
  "uptime": 123.456
}
```

### `GET /api/stats`
Get server statistics.

```powershell
curl http://localhost:3000/api/stats
```

Response:
```json
{
  "totalRooms": 2,
  "totalPlayers": 5,
  "rooms": [
    {
      "roomId": "game-123",
      "playerCount": 3,
      "players": [...]
    }
  ]
}
```

### `GET /api/rooms/:roomId`
Get specific room information.

```powershell
curl http://localhost:3000/api/rooms/game-123
```

Response:
```json
{
  "roomId": "game-123",
  "playerCount": 2,
  "players": [
    {
      "userId": "uuid-here",
      "username": "Player1",
      "isConnected": true,
      "score": 0
    }
  ]
}
```

## 🏗️ Architecture Details

### Room State Management

Each room contains:
```javascript
{
  roomId: string,
  players: Map<userId, Player>,
  createdAt: timestamp,
  lastActivity: timestamp
}
```

Each player contains:
```javascript
{
  userId: string,        // UUID
  username: string,      // Display name
  socketId: string,      // Current socket connection ID
  isConnected: boolean,  // Connection status
  score: number,         // Game score (Phase 2)
  joinedAt: timestamp,
  disconnectedAt?: timestamp,
  reconnectedAt?: timestamp
}
```

### Reconnection Flow

1. Player disconnects → `isConnected` set to `false`
2. Player data retained in room
3. On reconnect → client sends `reconnect_player` with saved `userId`
4. Server updates `socketId` and sets `isConnected` to `true`
5. All players notified of reconnection

### Room Cleanup

- When last player leaves → room is deleted immediately
- Disconnected players remain in room (for reconnection)
- No timeout-based cleanup in Phase 1

## 🛠️ Development

### Project uses ES6 Modules

```javascript
// Import syntax
import express from 'express';
import { generateUserId } from './utils/idGenerator.js';

// Export syntax
export function myFunction() { }
export default myClass;
```

### Adding New Features

1. **New Socket Event:**
   - Add handler in `src/sockets/socketHandler.js`
   - Follow existing event pattern
   - Add validation and error handling

2. **New Room Logic:**
   - Add method to `src/rooms/roomManager.js`
   - Keep it stateless and pure
   - Return data instead of emitting events

3. **New REST Endpoint:**
   - Add route in `src/server.js`
   - Use RoomManager for state access

## 📝 Code Quality Guidelines

- ✅ Use ES6 modules (`import`/`export`)
- ✅ Use `async/await` for asynchronous operations
- ✅ Keep business logic in RoomManager
- ✅ Keep socket handlers thin (validation + delegation)
- ✅ Return structured responses with `success` flag
- ✅ Log important events with context
- ✅ Use consistent error handling

## 🚧 What's NOT Yet Implemented

Phase 1 & 2 do NOT include:

- ❌ Database persistence
- ❌ Redis for scaling
- ❌ Drawing/canvas logic
- ❌ Advanced scoring (time bonus, drawer points)
- ❌ Word categories/difficulty levels
- ❌ Custom word lists
- ❌ Hint system (letter reveals)
- ❌ Authentication/authorization

✅ **Implemented in Phase 2:**
- ✔️ Game timer system (60s server-authoritative)
- ✔️ Basic scoring (+10 per correct guess)
- ✔️ Word selection (50-word hardcoded list)
- ✔️ Turn management (round-robin drawer rotation)

These advanced features will be added in Phase 3.

## 🔒 Security Notes

⚠️ **Development Mode**
- CORS is set to `*` (allow all origins)
- No authentication
- No rate limiting
- No input sanitization beyond basic validation

**Before Production:**
- Configure CORS for specific domains
- Add authentication/authorization
- Implement rate limiting
- Add input sanitization
- Use environment variables for configuration

## 🧪 Testing Scenarios

### Phase 1 Testing

#### Scenario 1: Basic Room Flow
1. Player A creates room "game-123"
2. Player B joins room "game-123"
3. Both players see each other in player list
4. Player A sends message → Player B receives it

#### Scenario 2: Reconnection
1. Player A joins room
2. Player A disconnects (close browser)
3. Save Player A's userId
4. Player A reconnects
5. Use "Reconnect" button with saved userId
6. Player A is back in the room with same identity

#### Scenario 3: Multiple Rooms
1. Create room "game-1"
2. Player A joins "game-1"
3. Create room "game-2" (different tab/client)
4. Player B joins "game-2"
5. Messages in "game-1" don't appear in "game-2"

### Phase 2 Testing

#### Scenario 4: Basic Game Flow
1. 2+ players join same room
2. Click "Start Game"
3. Round 1 begins with drawer and word
4. Non-drawer players submit guesses
5. Correct guess → +10 points, notification
6. Timer reaches 0 → round ends
7. 5-second delay → Round 2 starts with new drawer

#### Scenario 5: Early Round End
1. Start game with 3+ players
2. All non-drawer players guess correctly
3. Round ends before timer expires
4. Next round starts after delay

#### Scenario 6: Drawer Disconnect
1. Start game
2. Drawer disconnects during round
3. Round ends immediately
4. Next round starts with different drawer

**📖 Full Testing Guide:** See [PHASE2_TESTING.md](PHASE2_TESTING.md) for comprehensive game testing scenarios.

## 📚 Dependencies

- **express** (^4.18.2) - HTTP server framework
- **socket.io** (^4.6.1) - WebSocket library
- **uuid** (^9.0.0) - UUID generation

## 🤝 Contributing

Phase 1 & 2 complete. Architecture is designed to be extendable for Phase 3.

## 📄 License

ISC

## 👤 Author

Built with ❤️ for real-time multiplayer gaming

---

**Next Steps (Phase 3):**
- Drawing/canvas WebSocket events (stroke data, colors, brush sizes)
- Advanced scoring (time bonus, drawer points when guessed)
- Word categories and difficulty levels
- Custom word lists per room
- Hint system (reveal letters)
- Manual game controls (stop, skip, kick)
- Room settings (round count, timer duration)
- Spectator mode
- Chat moderation
