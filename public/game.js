class TapRaceGame {
    constructor() {
        this.socket = io();
        this.currentScreen = 'main-menu';
        this.roomId = null;
        this.playerName = null;
        this.gameState = 'waiting';
        this.isReady = false;
        this.canTap = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
    }

    initializeElements() {
        // Screens
        this.screens = {
            mainMenu: document.getElementById('main-menu'),
            lobby: document.getElementById('lobby'),
            game: document.getElementById('game'),
            finalResults: document.getElementById('final-results'),
            leaderboard: document.getElementById('leaderboard')
        };

        // Main menu elements
        this.playerNameInput = document.getElementById('player-name');
        this.roomIdInput = document.getElementById('room-id');
        this.joinGameBtn = document.getElementById('join-game');
        this.viewLeaderboardBtn = document.getElementById('view-leaderboard');

        // Lobby elements
        this.currentRoomIdSpan = document.getElementById('current-room-id');
        this.playersContainer = document.getElementById('players-container');
        this.readyBtn = document.getElementById('ready-btn');
        this.leaveRoomBtn = document.getElementById('leave-room');
        this.waitingMessage = document.getElementById('waiting-message');

        // Game elements
        this.currentRoundSpan = document.getElementById('current-round');
        this.maxRoundsSpan = document.getElementById('max-rounds');
        this.gameScores = document.getElementById('game-scores');
        this.tapZone = document.getElementById('tap-zone');
        this.tapCircle = document.getElementById('tap-circle');
        this.tapText = document.getElementById('tap-text');
        this.gameMessage = document.getElementById('game-message');
        this.roundResults = document.getElementById('round-results');
        this.roundResultsList = document.getElementById('round-results-list');

        // Final results elements
        this.finalResultsList = document.getElementById('final-results-list');
        this.playAgainBtn = document.getElementById('play-again');
        this.backToMenuBtn = document.getElementById('back-to-menu');

        // Leaderboard elements
        this.leaderboardList = document.getElementById('leaderboard-list');
        this.backFromLeaderboardBtn = document.getElementById('back-from-leaderboard');

        // Live activity
        this.liveActivity = document.getElementById('live-activity');
        this.activityContent = document.getElementById('activity-content');
    }

    setupEventListeners() {
        // Main menu
        this.joinGameBtn.addEventListener('click', () => this.joinGame());
        this.viewLeaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        
        // Allow Enter key to join game
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinGame();
        });
        this.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinGame();
        });

        // Lobby
        this.readyBtn.addEventListener('click', () => this.toggleReady());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());

        // Game
        this.tapZone.addEventListener('click', () => this.handleTap());
        this.tapZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleTap();
        });

        // Final results
        this.playAgainBtn.addEventListener('click', () => this.playAgain());
        this.backToMenuBtn.addEventListener('click', () => this.backToMenu());

        // Leaderboard
        this.backFromLeaderboardBtn.addEventListener('click', () => this.backToMenu());

        // Prevent context menu on tap zone
        this.tapZone.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    setupSocketListeners() {
        this.socket.on('joined-room', (data) => {
            this.roomId = data.roomId;
            this.currentRoomIdSpan.textContent = data.roomId;
            this.updatePlayersList(data.players);
            this.showScreen('lobby');
        });

        this.socket.on('player-joined', (data) => {
            this.updatePlayersList(data.players);
            this.showLiveActivity(`${data.playerName} joined the room!`);
        });

        this.socket.on('player-left', (data) => {
            this.updatePlayersList(data.players);
            this.showLiveActivity('A player left the room');
        });

        this.socket.on('player-ready', (data) => {
            this.updatePlayersList();
            if (data.allReady) {
                this.waitingMessage.classList.add('hidden');
                this.showLiveActivity('All players ready! Game starting soon...');
            }
        });

        this.socket.on('countdown-start', (data) => {
            this.currentRoundSpan.textContent = data.roundNumber;
            this.maxRoundsSpan.textContent = data.maxRounds;
            this.showScreen('game');
            this.startCountdown();
        });

        this.socket.on('round-start', () => {
            this.startRound();
        });

        this.socket.on('player-tapped', (data) => {
            this.showLiveActivity(`${data.playerName} tapped! ${data.reactionTime}ms (+${data.points} pts)`);
            this.updateScores();
        });

        this.socket.on('round-end', (data) => {
            this.endRound(data);
        });

        this.socket.on('game-end', (data) => {
            this.endGame(data);
        });

        this.socket.on('leaderboard', (data) => {
            this.displayLeaderboard(data);
        });
    }

    joinGame() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            this.showError('Please enter your name');
            return;
        }

        if (playerName.length > 20) {
            this.showError('Name must be 20 characters or less');
            return;
        }

        this.playerName = playerName;
        const roomId = this.roomIdInput.value.trim() || this.generateRoomId();

        this.socket.emit('join-room', {
            roomId: roomId,
            playerName: playerName
        });
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    showLeaderboard() {
        this.socket.emit('get-leaderboard');
        this.showScreen('leaderboard');
    }

    toggleReady() {
        if (!this.isReady) {
            this.socket.emit('ready-to-play');
            this.isReady = true;
            this.readyBtn.textContent = 'Ready!';
            this.readyBtn.disabled = true;
            this.readyBtn.classList.add('btn-success');
        }
    }

    leaveRoom() {
        this.socket.disconnect();
        this.socket.connect();
        this.isReady = false;
        this.roomId = null;
        this.readyBtn.textContent = 'Ready to Play!';
        this.readyBtn.disabled = false;
        this.readyBtn.classList.remove('btn-success');
        this.backToMenu();
    }

    startCountdown() {
        this.canTap = false;
        this.tapCircle.className = 'tap-circle waiting';
        this.tapText.textContent = 'GET READY...';
        this.gameMessage.textContent = 'Wait for the green circle!';
        this.roundResults.classList.add('hidden');
    }

    startRound() {
        this.canTap = true;
        this.tapCircle.className = 'tap-circle active';
        this.tapText.textContent = 'TAP NOW!';
        this.gameMessage.textContent = 'Tap as fast as you can!';
    }

    handleTap() {
        if (!this.canTap) return;

        this.canTap = false;
        this.tapCircle.className = 'tap-circle tapped';
        this.tapText.textContent = 'TAPPED!';
        this.gameMessage.textContent = 'Waiting for other players...';
        
        this.socket.emit('tap');
    }

    endRound(data) {
        this.canTap = false;
        this.tapCircle.className = 'tap-circle';
        this.tapText.textContent = 'ROUND OVER';
        this.gameMessage.textContent = `Round ${data.roundNumber} completed!`;
        
        this.displayRoundResults(data.results);
        this.updateScores();
        
        if (data.roundNumber < data.maxRounds) {
            setTimeout(() => {
                this.gameMessage.textContent = 'Next round starting soon...';
            }, 2000);
        }
    }

    endGame(data) {
        this.displayFinalResults(data.finalResults);
        this.showScreen('final-results');
    }

    displayRoundResults(results) {
        this.roundResults.classList.remove('hidden');
        this.roundResultsList.innerHTML = '';

        results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${this.getRankClass(index)}`;
            
            const reactionTime = result.reactionTime ? `${result.reactionTime}ms` : 'No tap';
            const points = result.reactionTime ? `+${this.calculatePoints(result.reactionTime)} pts` : '+0 pts';
            
            resultItem.innerHTML = `
                <div class="result-name">${index + 1}. ${result.name}</div>
                <div>
                    <div class="result-time">${reactionTime}</div>
                    <div class="result-points">${points}</div>
                </div>
            `;
            
            this.roundResultsList.appendChild(resultItem);
        });
    }

    displayFinalResults(results) {
        this.finalResultsList.innerHTML = '';

        results.forEach((result) => {
            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${this.getRankClass(result.rank - 1)}`;
            
            resultItem.innerHTML = `
                <div class="result-name">
                    ${result.rank}. ${result.name}
                </div>
                <div>
                    <div class="result-time">${result.score} points</div>
                    <div class="result-points">Avg: ${Math.round(result.avgReactionTime)}ms</div>
                </div>
            `;
            
            this.finalResultsList.appendChild(resultItem);
        });
    }

    displayLeaderboard(leaderboard) {
        this.leaderboardList.innerHTML = '';

        if (leaderboard.length === 0) {
            this.leaderboardList.innerHTML = '<p style="text-align: center; color: #666;">No players yet. Be the first!</p>';
            return;
        }

        leaderboard.forEach((player, index) => {
            const leaderboardItem = document.createElement('div');
            leaderboardItem.className = 'leaderboard-item';
            
            leaderboardItem.innerHTML = `
                <div class="leaderboard-rank">${index + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${player.name}</div>
                    <div class="leaderboard-stats">
                        ${player.gamesPlayed} games • Best: ${player.bestReactionTime}ms • Avg: ${player.avgReactionTime}ms
                    </div>
                </div>
                <div class="leaderboard-score">${Math.round(player.avgScore)}</div>
            `;
            
            this.leaderboardList.appendChild(leaderboardItem);
        });
    }

    updatePlayersList(players) {
        if (!players) return;
        
        this.playersContainer.innerHTML = '';
        
        players.forEach((player) => {
            const playerItem = document.createElement('div');
            playerItem.className = `player-item ${player.isReady ? 'ready' : ''}`;
            
            playerItem.innerHTML = `
                <div class="player-name">${player.name}</div>
                <div class="player-status ${player.isReady ? 'status-ready' : 'status-waiting'}">
                    ${player.isReady ? '✓ Ready' : '⏳ Waiting'}
                </div>
            `;
            
            this.playersContainer.appendChild(playerItem);
        });

        // Show/hide waiting message
        const allReady = players.every(p => p.isReady);
        if (allReady && players.length > 0) {
            this.waitingMessage.classList.add('hidden');
        } else if (this.isReady) {
            this.waitingMessage.classList.remove('hidden');
        }
    }

    updateScores() {
        // This would be updated with real-time score data from the server
        // For now, we'll leave it empty as scores are managed server-side
    }

    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.currentScreen = screenName;
        }
    }

    showLiveActivity(message) {
        this.activityContent.textContent = message;
        this.liveActivity.classList.remove('hidden');
        
        setTimeout(() => {
            this.liveActivity.classList.add('hidden');
        }, 3000);
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper modal
        alert(message);
    }

    getRankClass(index) {
        switch (index) {
            case 0: return 'first';
            case 1: return 'second';
            case 2: return 'third';
            default: return '';
        }
    }

    calculatePoints(reactionTime) {
        if (reactionTime < 200) return 100;
        if (reactionTime < 300) return 80;
        if (reactionTime < 500) return 60;
        if (reactionTime < 700) return 40;
        return 20;
    }

    playAgain() {
        this.isReady = false;
        this.readyBtn.textContent = 'Ready to Play!';
        this.readyBtn.disabled = false;
        this.readyBtn.classList.remove('btn-success');
        this.showScreen('lobby');
    }

    backToMenu() {
        this.leaveRoom();
        this.showScreen('mainMenu');
        
        // Clear inputs
        this.playerNameInput.value = '';
        this.roomIdInput.value = '';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TapRaceGame();
});
