# Phase 3: Competitive System Testing Guide

## Overview
Phase 3 adds competitive features including time-based scoring, configurable rounds, close guess detection, game endings with winners, and reset capability.

## Prerequisites
- Complete Phase 1 & 2
- Node.js server running on `http://localhost:3000`
- At least 2 players (browser windows/tabs)

## Test Scenarios

### Scenario 1: Configurable Rounds (1-10 Rounds)
**Purpose**: Verify the game accepts and executes custom round counts.

**Steps**:
1. Open two browser windows to `http://localhost:3000`
2. Window 1: Join/Create room as Player 1
3. Window 2: Join the same room as Player 2
4. Window 1: Set "Number of Rounds" to `5`
5. Window 1: Click "Start Game"
6. **Expected**: System message shows "🎮 Game started with 5 rounds!"
7. **Expected**: Round display shows "Round 1/5"
8. Play through multiple rounds
9. **Expected**: Each round increments (2/5, 3/5, 4/5, 5/5)
10. After 5 rounds complete
11. **Expected**: Game ends with winner declaration

**Pass Criteria**:
- ✅ Custom round count accepted (1-10)
- ✅ Round counter displays correctly (X/Y format)
- ✅ Game ends exactly after specified rounds
- ✅ Invalid inputs (0, 11, -1) show validation error

---

### Scenario 2: Time-Based Scoring System
**Purpose**: Verify scoring awards more points for faster guesses.

**Steps**:
1. Set up 2 players in a room
2. Start game with 3 rounds
3. **Round 1**: Player 2 waits 10 seconds before guessing correctly
4. Note the points awarded (e.g., "+83 points")
5. **Round 2**: Player 2 guesses correctly within 5 seconds
6. Note the points awarded (e.g., "+92 points")
7. **Round 3**: Player 2 guesses at 30 seconds remaining
8. Note the points awarded (e.g., "+50 points")

**Expected Formula**: `Points = floor(100 * (remainingTime / 60))`

**Example Calculations**:
- Guess at 55s: `floor(100 * 55/60) = 91 points`
- Guess at 30s: `floor(100 * 30/60) = 50 points`
- Guess at 10s: `floor(100 * 10/60) = 16 points`

**Pass Criteria**:
- ✅ Earlier guesses award MORE points
- ✅ Later guesses award LESS points
- ✅ Points displayed in correct_guess message: "🎉 Correct! +X points!"
- ✅ Scores accumulate correctly across rounds

---

### Scenario 3: Close Guess Detection
**Purpose**: Verify near-miss guesses trigger feedback.

**Test Words & Close Guesses**:
| Word | Close Guess (Edit Distance ≤ 1) | Not Close |
|------|----------------------------------|-----------|
| "apple" | "apples" (1 insertion) | "banana" |
| "dog" | "fog" (1 substitution) | "cat" |
| "car" | "ar" (1 deletion) | "truck" |
| "house" | "hous" (1 deletion) | "home" |

**Steps**:
1. Set up 2 players
2. Start game
3. Player 1 is drawer with word "apple"
4. Player 2 types "apples" and submits
5. **Expected**: Message "🔥 So close! Try again!"
6. Player 2 types "aplpe" (1 transposition)
7. **Expected**: Message "🔥 So close! Try again!"
8. Player 2 types "banana"
9. **Expected**: No close guess message
10. Player 2 types "apple"
11. **Expected**: "🎉 Correct! +X points!"

**Pass Criteria**:
- ✅ Edit distance 1 triggers close guess message
- ✅ Exact match awards points (not close guess)
- ✅ Substring match triggers close guess (if applicable)
- ✅ Completely wrong guess shows no close message

---

### Scenario 4: Drawer Bonus (+50 Points)
**Purpose**: Verify drawer receives bonus when word is guessed.

**Steps**:
1. Set up 2 players in room
2. Start game
3. **Round 1**: Player 1 is drawer
4. Player 2 guesses correctly
5. Note Player 1's score at round end
6. **Expected**: Drawer receives +50 bonus
7. **Round 2**: Player 2 is drawer
8. Nobody guesses (timer expires)
9. Note Player 2's score at round end
10. **Expected**: Drawer receives 0 bonus (no correct guesses)

**Example Scores**:
```
Round 1 End:
- Player 1 (Drawer): 50 points (drawer bonus)
- Player 2 (Guesser): 85 points (time-based)

Round 2 End (no guesses):
- Player 1: 50 points (unchanged)
- Player 2 (Drawer): 0 points (no bonus)
```

**Pass Criteria**:
- ✅ Drawer receives exactly +50 when someone guesses
- ✅ Drawer receives 0 if nobody guesses
- ✅ Drawer cannot guess their own word (input disabled)
- ✅ Score correctly displayed at round end

---

### Scenario 5: Game Ending & Winner Declaration
**Purpose**: Verify game ends properly with leaderboard.

**Steps**:
1. Set up 3 players in room (if possible, else 2)
2. Start game with 2 rounds
3. Play through both rounds with varying scores
4. After Round 2 ends
5. **Expected**: System message "🏆 GAME OVER!"
6. **Expected**: System message "👑 Winner: [PlayerName] with [Score] points!"
7. **Expected**: Leaderboard displayed with medals:
   ```
   📊 Final Leaderboard:
   🥇 Alice: 185 points
   🥈 Bob: 120 points
   🥉 Charlie: 90 points
   ```
8. **Expected**: Game status shows "🏆 Winner: Alice!"
9. **Expected**: "Start Game" button enabled
10. **Expected**: "Reset Game" button enabled
11. **Expected**: Round input enabled

**Pass Criteria**:
- ✅ Game ends after totalRounds complete
- ✅ Winner correctly identified (highest score)
- ✅ Leaderboard sorted descending by score
- ✅ Medals displayed (🥇🥈🥉 for top 3)
- ✅ UI elements re-enabled for next game
- ✅ Game state set to "finished"

---

### Scenario 6: Reset Game Functionality
**Purpose**: Verify game can be reset after completion.

**Steps**:
1. Complete a full game (Scenario 5)
2. Note final scores (e.g., Alice: 185, Bob: 120)
3. Click "Reset Game" button
4. **Expected**: System message "🔄 Game reset successfully. Ready to play again!"
5. **Expected**: All scores reset to 0
6. **Expected**: Game state returns to "waiting"
7. **Expected**: Round display shows "Round: - / - | Drawer: -"
8. **Expected**: "Start Game" button enabled
9. Start a new game
10. **Expected**: Fresh game starts from Round 1/X

**Invalid Reset Test**:
1. Start a game
2. During an active round, try to reset
3. **Expected**: Error message "Cannot reset during an active round"

**Pass Criteria**:
- ✅ Reset only works in 'waiting' or 'finished' state
- ✅ All player scores reset to 0
- ✅ Game state returns to 'waiting'
- ✅ UI resets to initial state
- ✅ Can start a new game after reset
- ✅ Cannot reset during active round

---

### Scenario 7: Correct Guesses Hidden from Chat
**Purpose**: Verify correct guesses don't spoil for other players.

**Steps**:
1. Set up 3 players: Alice, Bob, Charlie
2. Start game
3. Alice is drawer with word "cat"
4. Bob types "cat" and submits
5. **Bob's screen**: "🎉 Correct! +92 points!"
6. **Charlie's screen**: "✅ Bob guessed correctly! (+92 pts)"
7. **Expected**: No chat message showing "Bob: cat"
8. Charlie continues guessing
9. Charlie types "dog" and submits
10. **Expected**: Chat shows "Charlie: dog" (wrong guess)

**Pass Criteria**:
- ✅ Correct guesses NOT shown in public chat
- ✅ Wrong guesses ARE shown in public chat
- ✅ Success notification sent to guesser privately
- ✅ Success notification sent to others (without revealing word)
- ✅ Close guesses shown only to guesser

---

### Scenario 8: Edge Cases & Error Handling

**Test 8A: Invalid Round Count**
1. Try to start game with rounds = 0
2. **Expected**: Alert "Please enter a number of rounds between 1 and 10"
3. Try rounds = 15
4. **Expected**: Same validation error
5. Try rounds = -3
6. **Expected**: Same validation error

**Test 8B: Start Game During Active Round**
1. Start a game normally
2. During an active round, try clicking "Start Game" again
3. **Expected**: Error "Game is already in progress"

**Test 8C: Reset During Active Round**
1. Start a game normally
2. During Round 1, click "Reset Game"
3. **Expected**: Error "Cannot reset during an active round"

**Test 8D: Player Leaves Mid-Game**
1. Start game with 2 players
2. Player 2 closes browser window
3. **Expected**: Game stops: "🛑 Game stopped: Not enough players"
4. Remaining player can start new game

**Test 8E: Drawer Cannot Guess**
1. Player 1 is drawer
2. Player 1's guess input should be disabled
3. Try to enable it via DevTools and submit
4. **Expected**: Guess rejected or no effect

**Pass Criteria**:
- ✅ All edge cases handled gracefully
- ✅ Clear error messages displayed
- ✅ No server crashes or hung states

---

## Full Integration Test (All Features)

### Setup:
- 3 players: Alice, Bob, Charlie
- 3 rounds configured
- Words: "apple", "house", "pizza"

### Expected Flow:

**Round 1/3**: Alice draws "apple"
- Timer starts at 60s
- Bob guesses "apples" at 55s → "🔥 So close!"
- Bob guesses "apple" at 50s → "🎉 Correct! +83 points!"
- Charlie guesses "appel" at 45s → "🔥 So close!"
- Charlie guesses "apple" at 40s → "🎉 Correct! +66 points!"
- Round ends
- **Scores**: Alice: 50 (drawer bonus), Bob: 83, Charlie: 66

**Round 2/3**: Bob draws "house"
- Charlie guesses "hous" at 58s → "🔥 So close!"
- Charlie guesses "house" at 55s → "🎉 Correct! +91 points!"
- Alice guesses "home" at 50s → Wrong (shown in chat)
- Alice guesses "house" at 30s → "🎉 Correct! +50 points!"
- Round ends
- **Scores**: Alice: 100, Bob: 133 (83 + 50 bonus), Charlie: 157

**Round 3/3**: Charlie draws "pizza"
- Alice guesses "pizzas" at 52s → "🔥 So close!"
- Alice guesses "pizza" at 48s → "🎉 Correct! +80 points!"
- Bob guesses "pizza" at 35s → "🎉 Correct! +58 points!"
- Round ends
- **Scores**: Alice: 180, Bob: 191, Charlie: 207 (157 + 50 bonus)

**Game Ends**:
```
🏆 GAME OVER!
👑 Winner: Charlie with 207 points!
📊 Final Leaderboard:
🥇 Charlie: 207 points
🥈 Bob: 191 points
🥉 Alice: 180 points
```

**Reset & Replay**:
- Charlie clicks "Reset Game"
- All scores return to 0
- Start new game with 5 rounds
- Fresh game begins

---

## Test Checklist

### Phase 3 Features:
- [ ] Configurable rounds (1-10) accepted
- [ ] Time-based scoring (10-100 points)
- [ ] Earlier guesses = more points
- [ ] Close guess detection (edit distance ≤ 1)
- [ ] Close guess notification shown
- [ ] Drawer bonus (+50 if someone guesses)
- [ ] Drawer receives 0 if nobody guesses
- [ ] Game ends after totalRounds complete
- [ ] Winner declared correctly
- [ ] Leaderboard sorted and displayed
- [ ] Medals shown (🥇🥈🥉)
- [ ] Reset game functionality works
- [ ] Cannot reset during active round
- [ ] Correct guesses hidden from chat
- [ ] Wrong guesses shown in chat
- [ ] Points displayed in notifications
- [ ] Round display shows "X/Y" format
- [ ] UI elements disabled/enabled correctly

### Error Handling:
- [ ] Invalid round count rejected (< 1 or > 10)
- [ ] Cannot start during active game
- [ ] Cannot reset during active round
- [ ] Player disconnect handled gracefully
- [ ] Drawer cannot guess own word

### Backwards Compatibility:
- [ ] Phase 1 features still work (rooms, players, chat)
- [ ] Phase 2 features still work (rounds, timer, words)

---

## Known Behaviors

### Expected Behaviors:
1. **Minimum 2 Players**: Game requires at least 2 players to start
2. **Round Duration**: Fixed at 60 seconds per round
3. **Word List**: 50 words from wordService.js
4. **Scoring Range**: 10-100 points based on speed
5. **Close Guess Threshold**: Levenshtein distance ≤ 1
6. **Drawer Bonus**: Exactly +50 points if ≥1 correct guess

### Intentional Limitations (Not Bugs):
- No canvas/drawing yet (future phase)
- No player kick/ban system
- No chat commands
- No spectator mode
- No mid-game player join
- No persistent storage (in-memory only)

---

## Bug Reporting Template

If you find issues, report using this format:

```
**Phase**: 3
**Feature**: [Time-based scoring / Close guess / etc.]
**Browser**: Chrome 120 / Firefox 121 / etc.
**Players**: 2 / 3 / etc.

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:


**Actual Behavior**:


**Console Errors** (if any):


**Screenshots** (optional):

```

---

## Success Criteria

Phase 3 is complete when:
- ✅ All 8 test scenarios pass
- ✅ Full integration test succeeds
- ✅ All checklist items verified
- ✅ No critical bugs found
- ✅ User experience smooth and competitive

---

## Next Steps

After successful Phase 3 testing:
1. Commit to Git with message: "Phase 3: Competitive system with time-based scoring, close guess detection, and game endings"
2. Push to GitHub
3. Plan Phase 4 features (e.g., canvas drawing, advanced word management)

---

## Contact

For questions or issues, refer to:
- `PHASE3_SUMMARY.md` - Feature overview
- `README.md` - Project documentation
- GitHub Issues - Bug tracking
