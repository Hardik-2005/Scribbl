# Phase 3 Events Quick Reference

## Client → Server Events

### `start_game` (Updated)
**Purpose**: Start a game with configurable number of rounds

**Payload**:
```javascript
{
  roomId: string,
  totalRounds: number  // NEW: 1-10 (default: 3)
}
```

**Response**:
```javascript
{
  success: boolean,
  error?: string  // e.g., "Rounds must be 1-10"
}
```

**Example**:
```javascript
socket.emit('start_game', {
  roomId: 'game-123',
  totalRounds: 5
}, (response) => {
  if (response.success) {
    console.log('Game started with 5 rounds!');
  }
});
```

**Validation**:
- ✅ `totalRounds` must be 1-10
- ✅ Game state must be 'waiting' or 'finished'
- ✅ Room must have ≥2 players

---

### `reset_game` (New)
**Purpose**: Reset game state and scores after game ends

**Payload**:
```javascript
{
  roomId: string
}
```

**Response**:
```javascript
{
  success: boolean,
  error?: string  // e.g., "Cannot reset during an active round"
}
```

**Example**:
```javascript
socket.emit('reset_game', {
  roomId: 'game-123'
}, (response) => {
  if (response.success) {
    console.log('Game reset! Ready to play again.');
  }
});
```

**Validation**:
- ✅ Game state must NOT be 'playing' (active round)
- ✅ Can reset in 'waiting' or 'finished' state

---

### `submit_guess` (No Change)
**Purpose**: Submit a guess for the current word

**Payload**:
```javascript
{
  roomId: string,
  guess: string
}
```

**Notes**:
- Correct guesses now trigger time-based scoring (10-100 points)
- Close guesses trigger `close_guess` event
- Correct guesses are **NOT** shown in public chat

---

## Server → Client Events

### `game_started` (Updated)
**Purpose**: Notifies all players that the game has started

**Payload**:
```javascript
{
  totalRounds: number  // NEW: Total rounds in this game
}
```

**Example**:
```javascript
socket.on('game_started', (data) => {
  console.log(`Game started with ${data.totalRounds} rounds!`);
  // UI: Display "Game started with 5 rounds!"
});
```

---

### `round_started` (Updated)
**Purpose**: Notifies round start with drawer info

**Payload**:
```javascript
{
  roundNumber: number,
  totalRounds: number,  // NEW: Total rounds for display
  drawerId: string,
  drawerName: string
}
```

**Example**:
```javascript
socket.on('round_started', (data) => {
  console.log(`Round ${data.roundNumber}/${data.totalRounds}`);
  // UI: Display "Round 2/5 | Drawer: Alice"
});
```

---

### `correct_guess` (Updated)
**Purpose**: Notifies when a player guesses correctly

**Payload**:
```javascript
{
  userId: string,
  username: string,
  pointsEarned: number  // NEW: Time-based points (10-100)
}
```

**Example**:
```javascript
socket.on('correct_guess', (data) => {
  if (data.userId === myUserId) {
    // I guessed correctly
    console.log(`Correct! +${data.pointsEarned} points!`);
  } else {
    // Someone else guessed
    console.log(`${data.username} guessed! (+${data.pointsEarned} pts)`);
  }
});
```

**Notes**:
- Sent privately to guesser (with "You guessed correctly!" message)
- Broadcast to others (with "[Player] guessed correctly!" message)
- **NOT** shown in public chat
- Points based on remaining time: `floor(100 * remainingTime / 60)`

---

### `close_guess` (New)
**Purpose**: Private notification when guess is very close to correct answer

**Payload**:
```javascript
{
  message: string,      // e.g., "So close! Try again!"
  guess?: string,       // Optional: the close guess
  distance?: number     // Optional: Levenshtein distance
}
```

**Example**:
```javascript
socket.on('close_guess', (data) => {
  console.log('🔥 ' + data.message);
  // UI: Show temporary notification "So close!"
});
```

**Trigger Conditions**:
- Levenshtein distance ≤ 1 (one character different)
  - "apple" vs "apples" → distance 1 (insertion)
  - "dog" vs "fog" → distance 1 (substitution)
  - "car" vs "ar" → distance 1 (deletion)
- Word contains guess or guess contains word
  - "house" contains "hous"
  - "watermelon" contains "melon"

**Notes**:
- Sent **only** to the guesser (private)
- NOT shown in public chat
- Does NOT award points

---

### `round_ended` (Updated)
**Purpose**: Notifies round end with word reveal and scores

**Payload**:
```javascript
{
  roundNumber: number,
  totalRounds: number,  // NEW: Total rounds
  word: string,         // The correct word
  players: Array<{
    userId: string,
    username: string,
    score: number
  }>
}
```

**Example**:
```javascript
socket.on('round_ended', (data) => {
  console.log(`Round ${data.roundNumber}/${data.totalRounds} ended!`);
  console.log(`Word was: ${data.word}`);
  data.players.forEach(p => {
    console.log(`${p.username}: ${p.score} points`);
  });
});
```

**Notes**:
- Drawer may receive +50 bonus (if someone guessed)
- Scores updated in real-time

---

### `game_ended` (New)
**Purpose**: Notifies game completion with winner and final leaderboard

**Payload**:
```javascript
{
  winner: {
    userId: string,
    username: string,
    score: number
  },
  leaderboard: Array<{
    userId: string,
    username: string,
    score: number
  }>,  // Sorted descending by score
  totalRounds: number
}
```

**Example**:
```javascript
socket.on('game_ended', (data) => {
  console.log('🏆 GAME OVER!');
  console.log(`Winner: ${data.winner.username} with ${data.winner.score} points!`);
  
  console.log('Final Leaderboard:');
  data.leaderboard.forEach((player, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    console.log(`${medal} ${player.username}: ${player.score} points`);
  });
});
```

**UI Suggestions**:
- Display winner prominently (modal/banner)
- Show full leaderboard with medals
- Enable "Reset Game" button
- Disable game controls (start, guess)
- Change status to "Game Complete"

---

### `game_reset` (New)
**Purpose**: Notifies all players that game has been reset

**Payload**:
```javascript
{
  message: string,  // e.g., "Game reset successfully. Ready to play again!"
  players: Array<{
    userId: string,
    username: string,
    score: number  // All reset to 0
  }>
}
```

**Example**:
```javascript
socket.on('game_reset', (data) => {
  console.log('🔄 ' + data.message);
  // UI: Reset all displays to initial state
  // - Clear word display
  // - Reset timer
  // - Clear scores
  // - Set status to "Waiting to start"
  // - Enable "Start Game" button
});
```

**UI Actions**:
- Reset score display to 0 for all players
- Clear current word/round display
- Reset timer to "--"
- Change game state to "waiting"
- Enable "Start Game" button
- Keep "Reset Game" button enabled
- Clear any winner/leaderboard displays

---

## Scoring Details

### Time-Based Scoring
**Formula**: `points = floor(100 * (remainingTime / roundDuration))`

**Examples** (60-second rounds):
| Guess Time | Remaining Time | Points |
|------------|----------------|--------|
| 5 seconds  | 55s            | 91     |
| 15 seconds | 45s            | 75     |
| 30 seconds | 30s            | 50     |
| 45 seconds | 15s            | 25     |
| 55 seconds | 5s             | 8      |

**Range**: 10-100 points (minimum 10 to avoid 0-point guesses)

---

### Drawer Bonus
**Conditions**:
- Round ends (naturally or early)
- At least 1 player guessed correctly

**Award**: +50 points (fixed)

**Example**:
```javascript
Round 1:
- Alice (drawer): receives +50 if someone guesses
- Bob guesses at 55s: +91 points
- Charlie guesses at 30s: +50 points
- Round ends
  - Alice: 50 (drawer bonus)
  - Bob: 91
  - Charlie: 50

Round 2:
- Bob (drawer): receives 0 if nobody guesses
- Timer expires with no correct guesses
- Round ends
  - Alice: 50 (unchanged)
  - Bob: 91 (no bonus)
  - Charlie: 50 (unchanged)
```

---

## Levenshtein Distance Algorithm

**Purpose**: Measure similarity between two strings (edit distance)

**Example Distances**:
```javascript
levenshteinDistance("apple", "apples")  // 1 (insert 's')
levenshteinDistance("dog", "fog")       // 1 (substitute 'd' → 'f')
levenshteinDistance("car", "ar")        // 1 (delete 'c')
levenshteinDistance("cat", "dog")       // 3 (multiple edits)
levenshteinDistance("house", "hous")    // 1 (delete 'e')
```

**Implementation**:
```javascript
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[len1][len2];
}
```

**Close Guess Logic**:
```javascript
function isCloseGuess(guess, word) {
  const distance = levenshteinDistance(guess.toLowerCase(), word.toLowerCase());
  return distance === 1 || word.includes(guess) || guess.includes(word);
}
```

---

## State Machine

### Game States
```
waiting → playing → round_end → playing → ... → finished → waiting
   ↑                                                  ↓
   └──────────────────── reset ────────────────────┘
```

### Valid Actions Per State
| State | start_game | submit_guess | reset_game |
|-------|------------|--------------|------------|
| waiting | ✅ | ❌ | ✅ |
| playing | ❌ | ✅ | ❌ |
| round_end | ❌ | ❌ | ❌ |
| finished | ✅ | ❌ | ✅ |

---

## Example Full Game Flow

```javascript
// Player 1: Create and join room
socket.emit('create_room', { roomId: 'game-123' });
socket.emit('join_room', { roomId: 'game-123', username: 'Alice' });

// Player 2: Join room
socket.emit('join_room', { roomId: 'game-123', username: 'Bob' });

// Player 1: Start game with 3 rounds
socket.emit('start_game', { roomId: 'game-123', totalRounds: 3 });

// Server → All:
socket.on('game_started', { totalRounds: 3 });
socket.on('round_started', { roundNumber: 1, totalRounds: 3, drawerId: '...', drawerName: 'Alice' });

// Drawer (Alice):
socket.on('word_reveal', { word: 'apple' });

// Guesser (Bob):
socket.on('word_hint', { hint: '_ _ _ _ _' });

// Bob guesses close:
socket.emit('submit_guess', { roomId: 'game-123', guess: 'apples' });
socket.on('close_guess', { message: 'So close! Try again!' });  // Private

// Bob guesses correctly at 55s remaining:
socket.emit('submit_guess', { roomId: 'game-123', guess: 'apple' });
socket.on('correct_guess', { userId: 'bob-id', username: 'Bob', pointsEarned: 91 });

// Round ends:
socket.on('round_ended', {
  roundNumber: 1,
  totalRounds: 3,
  word: 'apple',
  players: [
    { userId: 'alice-id', username: 'Alice', score: 50 },  // Drawer bonus
    { userId: 'bob-id', username: 'Bob', score: 91 }
  ]
});

// ... Rounds 2 & 3 continue ...

// After Round 3:
socket.on('game_ended', {
  winner: { userId: 'bob-id', username: 'Bob', score: 275 },
  leaderboard: [
    { userId: 'bob-id', username: 'Bob', score: 275 },
    { userId: 'alice-id', username: 'Alice', score: 200 }
  ],
  totalRounds: 3
});

// Reset game:
socket.emit('reset_game', { roomId: 'game-123' });
socket.on('game_reset', { 
  message: 'Game reset successfully. Ready to play again!',
  players: [
    { userId: 'alice-id', username: 'Alice', score: 0 },
    { userId: 'bob-id', username: 'Bob', score: 0 }
  ]
});
```

---

## Migration from Phase 2

### Breaking Changes
❌ **None** - Phase 3 extends Phase 2 without breaking changes

### New Required Handling
✅ **Handle New Events**: Add listeners for `game_ended`, `game_reset`, `close_guess`
✅ **Update UI**: Display `pointsEarned` in `correct_guess` notifications
✅ **Update Display**: Show "Round X/Y" instead of "Round X"
✅ **Add Input**: Round count input (1-10)
✅ **Add Button**: Reset Game button

### Optional Updates
- Show leaderboard modal on `game_ended`
- Display winner with animations
- Add medals for top 3 players
- Show close guess with fire emoji effect

---

## Quick Checklist for Implementation

UI Elements:
- [ ] Add "Number of Rounds" input (min=1, max=10, default=3)
- [ ] Add "Reset Game" button
- [ ] Update round display to "Round X/Y"
- [ ] Add winner/leaderboard display area

Event Handlers (Client):
- [ ] Update `start_game` to send `totalRounds`
- [ ] Add `reset_game` emit on button click
- [ ] Add `game_ended` listener (show winner/leaderboard)
- [ ] Add `game_reset` listener (reset UI)
- [ ] Add `close_guess` listener (show notification)
- [ ] Update `correct_guess` listener (show `pointsEarned`)
- [ ] Update `round_started` listener (show total rounds)

Validation:
- [ ] Validate `totalRounds` input (1-10)
- [ ] Disable reset during active round
- [ ] Enable reset when game finishes

Testing:
- [ ] Test 1-round game
- [ ] Test 10-round game
- [ ] Test time-based scoring (early vs late guess)
- [ ] Test close guess detection
- [ ] Test drawer bonus
- [ ] Test game ending
- [ ] Test reset functionality

---

## Related Documentation

- [PHASE3_SUMMARY.md](PHASE3_SUMMARY.md) - Comprehensive implementation overview
- [PHASE3_TESTING.md](PHASE3_TESTING.md) - Full testing guide with scenarios
- [README.md](README.md) - Project documentation
- [PHASE2_TESTING.md](PHASE2_TESTING.md) - Phase 2 testing guide

---

**Phase 3 Complete!** 🎉  
All competitive features implemented and ready for testing.
