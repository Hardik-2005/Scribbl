# Phase 2 - Game Engine Testing Guide

This guide covers testing the new game functionality added in Phase 2.

## 🎮 What's New in Phase 2

- ✅ Game state management (waiting → playing → round_end)
- ✅ Round lifecycle with automatic progression
- ✅ Server-authoritative timer (60 seconds per round)
- ✅ Drawer selection (round-robin rotation)
- ✅ Word selection from hardcoded list (50 words)
- ✅ Guess validation system
- ✅ Basic scoring (+10 points per correct guess)
- ✅ Drawer disconnect handling
- ✅ Early round end when all players guess correctly

## 🚀 Quick Start

1. **Start the server:**
```powershell
npm start
```

2. **Open multiple browser tabs:**
- Tab 1: http://localhost:3000
- Tab 2: http://localhost:3000
- (Minimum 2 players required)

## 📝 Complete Testing Flow

### Step 1: Setup Players

**Tab 1 (Player 1):**
1. Click "Connect to Server"
2. Enter Room ID: `test-game`
3. Enter Username: `Alice`
4. Click "Create Room"
5. Click "Join Room"

**Tab 2 (Player 2):**
1. Click "Connect to Server"
2. Enter Room ID: `test-game`
3. Enter Username: `Bob`
4. Click "Join Room"

### Step 2: Start the Game

**Any Player:**
1. Click "Start Game" button (green button in Game Control panel)
2. You should see:
   - "🎮 Game started!" message
   - "🎯 Round 1 started - [Drawer] is drawing!" message
   - Timer starts counting down from 60

### Step 3: Understand Roles

**If you are the DRAWER:**
- Game status shows: "🎨 You are drawing!"
- Word display shows: The actual word (e.g., "APPLE")
- Guess input is DISABLED (drawers can't guess)
- You receive a message: "✨ Your word is: [word]"

**If you are the GUESSER:**
- Game status shows: "🤔 Guess the word!"
- Word display shows: Masked word (e.g., "_ _ _ _ _")
- Guess input is ENABLED
- Type guesses and press Enter or click "Submit Guess"

### Step 4: Submit Guesses

**Guesser Players:**
1. Type a guess (e.g., "apple")
2. Press Enter or click "Submit Guess"

**What happens:**
- **Incorrect guess** → Shows as regular chat message
- **Correct guess** → 
  - "🎉 Correct! You guessed the word!" (for you)
  - "✅ [Username] guessed correctly!" (for others)
  - +10 points added to your score
  - Your guess input becomes disabled
  - Player list updates with new score

### Step 5: Round End Scenarios

**Scenario A: Time runs out (60 seconds)**
- Timer reaches 0
- "⏱️ Round ended! The word was: [word]"
- Word is revealed to everyone
- Scores displayed
- After 5 seconds → Next round starts automatically

**Scenario B: All players guess correctly**
- Round ends immediately (before timer expires)
- Same end-round sequence as above

**Scenario C: Drawer disconnects mid-round**
- Round ends immediately
- "Round ended - drawer_left"
- Next round starts with new drawer

### Step 6: Round Progression

After each round:
1. **5-second delay**
2. **New round starts:**
   - Round number increments
   - New drawer selected (rotates through players)
   - New word selected randomly
   - Timer resets to 60 seconds
   - All hasGuessedCurrentRound flags reset

### Step 7: Game Stop Scenarios

**Manual stop:**
- Currently no manual stop (Phase 3 feature)

**Automatic stop:**
- Less than 2 connected players
- "🛑 Game stopped: Not enough players to continue"
- Game returns to waiting state
- Can start new game when players rejoin

## 🧪 Test Cases

### Test Case 1: Basic Game Flow
**Requirements:** 2 players

1. Create room and join both players
2. Start game
3. Drawer sees word, guessers see masked word
4. Guesser submits correct answer
5. Score updates correctly (+10 points)
6. Round continues for other guessers
7. Timer reaches 0
8. Round ends, scores shown
9. Next round starts automatically

**Expected:** ✅ All steps complete successfully

---

### Test Case 2: All Players Guess Correctly
**Requirements:** 3+ players

1. Start game with 3 players
2. All non-drawer players guess correctly
3. Round should end early (before 60 seconds)
4. Next round starts after 5 seconds

**Expected:** ✅ Early round end triggered

---

### Test Case 3: Drawer Rotation
**Requirements:** 3+ players, multiple rounds

1. Start game
2. Note drawer in Round 1 (e.g., Alice)
3. Wait for Round 2
4. Note drawer in Round 2 (e.g., Bob)
5. Wait for Round 3
6. Note drawer in Round 3 (e.g., Charlie)
7. Wait for Round 4
8. Drawer should be Alice again (round-robin)

**Expected:** ✅ Drawers rotate in order

---

### Test Case 4: Drawer Cannot Guess
**Requirements:** 2 players

1. Start game
2. Drawer tries to submit guess
3. Guess input should be disabled
4. No guess should be registered

**Expected:** ✅ Drawer cannot submit guesses

---

### Test Case 5: Duplicate Guess Prevention
**Requirements:** 2 players

1. Guesser submits correct answer
2. Guesser tries to guess again
3. Input becomes disabled after correct guess
4. No additional points awarded

**Expected:** ✅ Cannot guess twice

---

### Test Case 6: Drawer Disconnect
**Requirements:** 2+ players

1. Start game
2. Drawer disconnects (close browser tab)
3. Round should end immediately
4. "drawer_left" reason shown
5. Next round starts with different drawer

**Expected:** ✅ Graceful handling of drawer disconnect

---

### Test Case 7: Insufficient Players During Game
**Requirements:** Start with 2, then 1 leaves

1. Start game with 2 players
2. One player disconnects
3. Game stops automatically
4. "Not enough players to continue"

**Expected:** ✅ Game stops when <2 players

---

### Test Case 8: Case-Insensitive Guessing
**Requirements:** 2 players

1. Word is "apple"
2. Guesser types "APPLE" or "ApPlE"
3. Should be accepted as correct

**Expected:** ✅ Case doesn't matter

---

### Test Case 9: Timer Accuracy
**Requirements:** 2 players

1. Start round
2. Watch timer count down
3. Timer should update every second
4. Round ends at 0

**Expected:** ✅ Timer accurate, updates every 1s

---

### Test Case 10: Score Persistence
**Requirements:** 2 players

1. Player guesses correctly in Round 1 → 10 points
2. Player guesses correctly in Round 2 → 20 points
3. Player guesses correctly in Round 3 → 30 points

**Expected:** ✅ Scores accumulate across rounds

---

## 🎨 UI Indicators

### Game Status Display
- ⏸️ Waiting to start
- 🎮 Game in progress
- 🎨 You are drawing!
- 🤔 Guess the word!
- ✅ You guessed correctly!
- ⏸️ Round ended

### Timer Colors
- **White:** More than 30 seconds
- **Yellow:** 11-30 seconds
- **Red:** 10 seconds or less

### Word Display
- **Drawer:** Full word in uppercase
- **Guesser:** Masked (e.g., "_ _ _ _ _")
- **Round End:** Full word revealed

## 📊 Debugging

### Check Server Logs
The server logs important events:
```
[GameEngine] Game started in room test-game
[GameEngine] Round 1 started - Drawer: Alice, Word: apple
[GameEngine] Bob guessed correctly!
[GameEngine] Round 1 ended - Reason: time_up
```

### Use REST API
Check game state via API:
```powershell
# Get room stats
curl http://localhost:3000/api/rooms/test-game

# Response includes:
# - gameState
# - currentDrawerId
# - roundNumber
# - players with scores
```

### Common Issues

**Issue:** Start Game button disabled
**Solution:** Must have at least 2 connected players in room

**Issue:** Cannot guess
**Solution:** 
- Check if you're the drawer (drawers can't guess)
- Check if you already guessed correctly this round
- Check if game is in "playing" state

**Issue:** Round not ending
**Solution:**
- Check timer (should count down)
- Check server logs for errors
- Room must have valid gameState

**Issue:** Timer not updating
**Solution:**
- Check server logs for timer start
- Multiple timers may be running (shouldn't happen)
- Refresh page and reconnect

## 📦 Architecture Notes

### Game Logic Separation
- **gameEngine.js:** All game logic (start, rounds, timers, scoring)
- **wordService.js:** Word management
- **roomManager.js:** Data storage only
- **socketHandler.js:** Event routing only

### Timer Management
- Server-authoritative (not client-side)
- One timer per room (stored in Map)
- Cleaned up on round end
- Automatically stopped on room deletion

### State Flow
```
waiting → [start_game] → playing → round_end → playing → ...
                                              ↓
                                           waiting (if <2 players)
```

## 🎯 Next Steps (Phase 3)

Features NOT yet implemented:
- ❌ Drawing/canvas events
- ❌ Advanced scoring (time bonus, drawer bonus)
- ❌ Word categories
- ❌ Custom word lists
- ❌ Hint system (reveal letters)
- ❌ Manual game stop button
- ❌ Game settings (round duration, points)
- ❌ Kick player
- ❌ Spectator mode

## 🐛 Bug Reports

If you encounter issues, check:
1. Node.js version (>= 18.0.0)
2. All dependencies installed (`npm install`)
3. Server running on port 3000
4. Browser console for errors
5. Server console for backend errors

## 🎮 Pro Tips

1. **Open DevTools:** Press F12 to see WebSocket messages
2. **Multiple Tabs:** Test with 3+ players for full experience
3. **Quick Testing:** Use short room names like "test"
4. **Score Tracking:** Watch player list update in real-time
5. **Timer Pressure:** Try guessing in last 10 seconds (red timer)

---

**Phase 2 Complete! ✅**

Ready for Phase 3: Drawing mechanics and advanced features.
