const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const gameRooms = new Map();
const playerStats = new Map();

// Simple power-up system
const powerUpTypes = {
    speedBoost: { name: 'Speed Boost', icon: '⚡', rarity: 0.3 },
    doublePoints: { name: 'Double Points', icon: '💎', rarity: 0.2 },
    shield: { name: 'Shield', icon: '🛡️', rarity: 0.15 },
    freeze: { name: 'Freeze Others', icon: '❄️', rarity: 0.1 },
    precision: { name: 'Precision', icon: '🎯', rarity: 0.25 }
};

class GameRoom {
    constructor(id, gameMode = 'classic') {
        this.id = id;
        this.gameMode = gameMode;
        this.players = new Map();
        this.gameState = 'waiting'; // waiting, countdown, active, finished
        this.roundNumber = 0;
        this.maxRounds = this.getMaxRounds(gameMode);
        this.countdownTimer = null;
        this.gameTimer = null;
        this.currentRoundStart = null;
        this.roundResults = [];
        this.powerUpsEnabled = gameMode === 'powerUp' || gameMode === 'marathon';
        this.chatMessages = [];
    }

    getMaxRounds(gameMode) {
        const modes = {
            classic: 5,
            blitz: 10,
            powerUp: 5,
            elimination: 999,
            marathon: 20,
            precision: 7
        };
        return modes[gameMode] || 5;
    }

    addPlayer(playerId, playerName) {
        this.players.set(playerId, {
            id: playerId,
            name: playerName,
            score: 0,
            reactionTimes: [],
            isReady: false,
            lastTapTime: null
        });
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        if (this.players.size === 0) {
            this.cleanup();
        }
    }

    startCountdown() {
        if (this.players.size < 1) return;
        
        this.gameState = 'countdown';
        this.roundNumber++;
        
        // Random delay between 2-6 seconds
        const delay = Math.random() * 4000 + 2000;
        
        io.to(this.id).emit('countdown-start', {
            roundNumber: this.roundNumber,
            maxRounds: this.maxRounds
        });

        this.countdownTimer = setTimeout(() => {
            this.startRound();
        }, delay);
    }

    startRound() {
        this.gameState = 'active';
        this.currentRoundStart = Date.now();
        
        // Clear any previous taps
        this.players.forEach(player => {
            player.lastTapTime = null;
        });

        io.to(this.id).emit('round-start', {
            timestamp: this.currentRoundStart
        });

        // Auto-end round after 3 seconds if no one taps
        this.gameTimer = setTimeout(() => {
            this.endRound();
        }, 3000);
    }

    handleTap(playerId) {
        if (this.gameState !== 'active') return false;

        const player = this.players.get(playerId);
        if (!player || player.lastTapTime) return false;

        const tapTime = Date.now();
        const reactionTime = tapTime - this.currentRoundStart;
        
        player.lastTapTime = tapTime;
        player.reactionTimes.push(reactionTime);

        // Award points based on reaction time
        let points = 0;
        if (reactionTime < 200) points = 100;
        else if (reactionTime < 300) points = 80;
        else if (reactionTime < 500) points = 60;
        else if (reactionTime < 700) points = 40;
        else points = 20;

        player.score += points;

        // Check if all players have tapped
        const allTapped = Array.from(this.players.values()).every(p => p.lastTapTime);
        
        io.to(this.id).emit('player-tapped', {
            playerId: playerId,
            playerName: player.name,
            reactionTime: reactionTime,
            points: points,
            allTapped: allTapped
        });

        if (allTapped) {
            clearTimeout(this.gameTimer);
            setTimeout(() => this.endRound(), 1000);
        }

        return true;
    }

    endRound() {
        this.gameState = 'finished';
        
        // Calculate round results
        const roundResult = Array.from(this.players.values())
            .map(player => ({
                id: player.id,
                name: player.name,
                reactionTime: player.lastTapTime ? 
                    player.lastTapTime - this.currentRoundStart : null,
                score: player.score
            }))
            .sort((a, b) => {
                if (!a.reactionTime && !b.reactionTime) return 0;
                if (!a.reactionTime) return 1;
                if (!b.reactionTime) return -1;
                return a.reactionTime - b.reactionTime;
            });

        this.roundResults.push(roundResult);

        io.to(this.id).emit('round-end', {
            results: roundResult,
            roundNumber: this.roundNumber,
            maxRounds: this.maxRounds
        });

        // Start next round or end game
        if (this.roundNumber < this.maxRounds) {
            setTimeout(() => {
                this.gameState = 'waiting';
                this.startCountdown();
            }, 3000);
        } else {
            setTimeout(() => {
                this.endGame();
            }, 3000);
        }
    }

    endGame() {
        // Calculate final standings
        const finalResults = Array.from(this.players.values())
            .sort((a, b) => b.score - a.score)
            .map((player, index) => ({
                rank: index + 1,
                id: player.id,
                name: player.name,
                score: player.score,
                avgReactionTime: player.reactionTimes.length > 0 ? 
                    player.reactionTimes.reduce((a, b) => a + b, 0) / player.reactionTimes.length : 0
            }));

        // Update global stats
        finalResults.forEach(result => {
            if (!playerStats.has(result.name)) {
                playerStats.set(result.name, {
                    gamesPlayed: 0,
                    totalScore: 0,
                    bestReactionTime: Infinity,
                    avgReactionTime: 0
                });
            }
            
            const stats = playerStats.get(result.name);
            stats.gamesPlayed++;
            stats.totalScore += result.score;
            
            const player = this.players.get(result.id);
            if (player.reactionTimes.length > 0) {
                const bestTime = Math.min(...player.reactionTimes);
                stats.bestReactionTime = Math.min(stats.bestReactionTime, bestTime);
                
                const totalReactions = stats.avgReactionTime * (stats.gamesPlayed - 1) + result.avgReactionTime;
                stats.avgReactionTime = totalReactions / stats.gamesPlayed;
            }
        });

        io.to(this.id).emit('game-end', {
            finalResults: finalResults
        });

        // Reset room for new game
        setTimeout(() => {
            this.resetRoom();
        }, 10000);
    }

    resetRoom() {
        this.gameState = 'waiting';
        this.roundNumber = 0;
        this.roundResults = [];
        this.players.forEach(player => {
            player.score = 0;
            player.reactionTimes = [];
            player.isReady = false;
            player.lastTapTime = null;
        });
    }

    cleanup() {
        if (this.countdownTimer) clearTimeout(this.countdownTimer);
        if (this.gameTimer) clearTimeout(this.gameTimer);
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (data) => {
        const { roomId, playerName, gameMode } = data;
        
        // Validate input
        if (!roomId || !playerName || typeof roomId !== 'string' || typeof playerName !== 'string') {
            socket.emit('error', 'Invalid room ID or player name');
            return;
        }
        
        // Leave current room if in one
        if (socket.roomId && socket.roomId !== roomId) {
            const oldRoom = gameRooms.get(socket.roomId);
            if (oldRoom) {
                oldRoom.removePlayer(socket.id);
                socket.to(socket.roomId).emit('player-left', {
                    playerId: socket.id,
                    players: Array.from(oldRoom.players.values())
                });
            }
            socket.leave(socket.roomId);
        }
        
        if (!gameRooms.has(roomId)) {
            gameRooms.set(roomId, new GameRoom(roomId, gameMode || 'classic'));
            console.log(`Created new room: ${roomId} with mode: ${gameMode || 'classic'}`);
        }

        const room = gameRooms.get(roomId);
        room.addPlayer(socket.id, playerName);
        
        socket.join(roomId);
        socket.roomId = roomId;

        // Send current room state
        socket.emit('joined-room', {
            roomId: roomId,
            gameMode: room.gameMode,
            players: Array.from(room.players.values()),
            gameState: room.gameState,
            roundNumber: room.roundNumber,
            chatMessages: room.chatMessages
        });

        // Notify other players in this room only
        socket.to(roomId).emit('player-joined', {
            playerId: socket.id,
            playerName: playerName,
            players: Array.from(room.players.values())
        });
        
        console.log(`Player ${playerName} joined room ${roomId}. Room now has ${room.players.size} players`);
    });

    socket.on('ready-to-play', () => {
        if (!socket.roomId) {
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = gameRooms.get(socket.roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            delete socket.roomId;
            return;
        }

        const player = room.players.get(socket.id);
        if (player && !player.isReady) {
            player.isReady = true;
            
            // Check if all players are ready
            const allReady = Array.from(room.players.values()).every(p => p.isReady);
            
            // Notify only players in this room
            io.to(socket.roomId).emit('player-ready', {
                playerId: socket.id,
                allReady: allReady
            });

            // Start game if all ready and game is waiting
            if (allReady && room.gameState === 'waiting' && room.players.size > 0) {
                setTimeout(() => room.startCountdown(), 1000);
            }
        }
    });

    socket.on('leave-room', () => {
        if (socket.roomId) {
            const room = gameRooms.get(socket.roomId);
            if (room) {
                room.removePlayer(socket.id);
                
                // Notify other players
                socket.to(socket.roomId).emit('player-left', {
                    playerId: socket.id,
                    players: Array.from(room.players.values())
                });

                // Clean up empty rooms
                if (room.players.size === 0) {
                    gameRooms.delete(socket.roomId);
                }
            }
            
            socket.leave(socket.roomId);
            socket.roomId = null;
        }
    });

    socket.on('tap', () => {
        if (!socket.roomId) {
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = gameRooms.get(socket.roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            delete socket.roomId;
            return;
        }
        
        room.handleTap(socket.id);
    });

    socket.on('get-leaderboard', () => {
        const leaderboard = Array.from(playerStats.entries())
            .map(([name, stats]) => ({
                name: name,
                gamesPlayed: stats.gamesPlayed,
                totalScore: stats.totalScore,
                avgScore: stats.totalScore / stats.gamesPlayed,
                bestReactionTime: stats.bestReactionTime === Infinity ? 0 : stats.bestReactionTime,
                avgReactionTime: Math.round(stats.avgReactionTime)
            }))
            .sort((a, b) => b.avgScore - a.avgScore)
            .slice(0, 10);

        socket.emit('leaderboard', leaderboard);
    });

    socket.on('chat-message', (data) => {
        if (!socket.roomId) {
            socket.emit('error', 'Not in a room');
            return;
        }
        
        const room = gameRooms.get(socket.roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            delete socket.roomId;
            return;
        }

        // Validate message data
        if (!data || !data.playerName || !data.message || typeof data.message !== 'string') {
            socket.emit('error', 'Invalid message data');
            return;
        }

        // Sanitize message
        const sanitizedMessage = data.message.trim().substring(0, 200);
        if (!sanitizedMessage) return;

        const message = {
            playerName: data.playerName,
            message: sanitizedMessage,
            timestamp: Date.now()
        };

        room.chatMessages.push(message);
        
        // Keep only last 50 messages
        if (room.chatMessages.length > 50) {
            room.chatMessages = room.chatMessages.slice(-50);
        }

        // Broadcast to all players in this room only
        io.to(socket.roomId).emit('chat-message', message);
    });

    socket.on('use-powerup', (data) => {
        if (!socket.roomId) return;
        
        const room = gameRooms.get(socket.roomId);
        if (!room || !room.powerUpsEnabled) return;

        const player = room.players.get(socket.id);
        if (!player) return;

        // Simple power-up activation
        const powerUp = powerUpTypes[data.powerUpId];
        if (powerUp) {
            socket.emit('powerup-activated', {
                powerUp: powerUp,
                activePowerUps: [powerUp] // Simplified for demo
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (socket.roomId) {
            const room = gameRooms.get(socket.roomId);
            if (room) {
                room.removePlayer(socket.id);
                
                // Notify other players in the same room only
                socket.to(socket.roomId).emit('player-left', {
                    playerId: socket.id,
                    players: Array.from(room.players.values())
                });

                // Clean up empty rooms
                if (room.players.size === 0) {
                    // Clear any timers to prevent memory leaks
                    if (room.countdownTimer) {
                        clearInterval(room.countdownTimer);
                    }
                    if (room.gameTimer) {
                        clearTimeout(room.gameTimer);
                    }
                    gameRooms.delete(socket.roomId);
                    console.log('Room cleaned up:', socket.roomId);
                }
            }
            
            socket.leave(socket.roomId);
            delete socket.roomId;
        }
    });
});

// Debug endpoint to check room states (remove in production)
app.get('/debug/rooms', (req, res) => {
    const roomData = Array.from(gameRooms.entries()).map(([id, room]) => ({
        id,
        playerCount: room.players.size,
        gameState: room.gameState,
        gameMode: room.gameMode,
        roundNumber: room.roundNumber,
        players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            isReady: p.isReady
        }))
    }));
    
    res.json({
        totalRooms: gameRooms.size,
        rooms: roomData
    });
});

server.listen(PORT, () => {
    console.log(`Tap Race server running on port ${PORT}`);
});
