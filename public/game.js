class TapRaceGame {
    constructor() {
        this.socket = io();
        this.currentScreen = 'main-menu';
        this.roomId = null;
        this.playerName = null;
        this.gameState = 'waiting';
        this.isReady = false;
        this.canTap = false;
        this.players = [];
        this.activityTimeout = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        
        // Debounced functions for performance
        this.debouncedUpdatePlayers = this.debounce(this.updatePlayersList.bind(this), 100);
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
            this.players = data.players || [];
            this.debouncedUpdatePlayers();
            this.showScreen('lobby');
        });

        this.socket.on('player-joined', (data) => {
            this.players = data.players || [];
            this.debouncedUpdatePlayers();
            this.showLiveActivity(`${data.playerName} joined!`);
        });

        this.socket.on('player-left', (data) => {
            this.players = data.players || [];
            this.debouncedUpdatePlayers();
            this.showLiveActivity('Player left');
        });

        this.socket.on('player-ready', (data) => {
            // Update the specific player's ready status
            const player = this.players.find(p => p.id === data.playerId);
            if (player) {
                player.isReady = true;
            }
            this.debouncedUpdatePlayers();
            
            if (data.allReady) {
                this.waitingMessage.classList.add('hidden');
                this.showLiveActivity('All ready! Starting...');
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
            this.showLiveActivity(`${data.playerName}: ${data.reactionTime}ms!`);
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
        if (!this.isReady && this.roomId) {
            this.socket.emit('ready-to-play');
            this.isReady = true;
            this.readyBtn.textContent = 'Ready!';
            this.readyBtn.disabled = true;
            this.readyBtn.style.background = '#28a745';
            this.readyBtn.style.color = 'white';
        }
    }

    leaveRoom() {
        if (this.roomId) {
            this.socket.emit('leave-room');
        }
        this.resetPlayerState();
        this.showScreen('mainMenu');
    }

    resetPlayerState() {
        this.isReady = false;
        this.roomId = null;
        this.players = [];
        this.readyBtn.textContent = 'Ready to Play!';
        this.readyBtn.disabled = false;
        this.readyBtn.style.background = '';
        this.readyBtn.style.color = '';
        this.waitingMessage.classList.add('hidden');
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
        
        if (data.roundNumber < data.maxRounds) {
            setTimeout(() => {
                this.gameMessage.textContent = 'Next round starting soon...';
            }, 2000);
        }
    }

    endGame(data) {
        this.displayFinalResults(data.finalResults);
        this.showScreen('finalResults');
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

    displayRoundResults(results) {
        this.roundResults.classList.remove('hidden');
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${this.getRankClass(index)}`;
            
            const reactionTime = result.reactionTime ? `${result.reactionTime}ms` : 'No tap';
            const points = result.reactionTime ? `+${this.calculatePoints(result.reactionTime)} pts` : '+0 pts';
            
            resultItem.innerHTML = `
                <div class="result-name">${index + 1}. ${this.escapeHtml(result.name)}</div>
                <div>
                    <div class="result-time">${reactionTime}</div>
                    <div class="result-points">${points}</div>
                </div>
            `;
            
            fragment.appendChild(resultItem);
        });
        
        this.roundResultsList.innerHTML = '';
        this.roundResultsList.appendChild(fragment);
    }

    displayFinalResults(results) {
        const fragment = document.createDocumentFragment();

        results.forEach((result) => {
            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${this.getRankClass(result.rank - 1)}`;
            
            resultItem.innerHTML = `
                <div class="result-name">
                    ${result.rank}. ${this.escapeHtml(result.name)}
                </div>
                <div>
                    <div class="result-time">${result.score} points</div>
                    <div class="result-points">Avg: ${Math.round(result.avgReactionTime)}ms</div>
                </div>
            `;
            
            fragment.appendChild(resultItem);
        });
        
        this.finalResultsList.innerHTML = '';
        this.finalResultsList.appendChild(fragment);
    }

    displayLeaderboard(leaderboard) {
        if (leaderboard.length === 0) {
            this.leaderboardList.innerHTML = '<p style="text-align: center; color: #666;">No players yet. Be the first!</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        leaderboard.forEach((player, index) => {
            const leaderboardItem = document.createElement('div');
            leaderboardItem.className = 'leaderboard-item';
            
            leaderboardItem.innerHTML = `
                <div class="leaderboard-rank">${index + 1}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${this.escapeHtml(player.name)}</div>
                    <div class="leaderboard-stats">
                        ${player.gamesPlayed} games • Best: ${player.bestReactionTime}ms • Avg: ${player.avgReactionTime}ms
                    </div>
                </div>
                <div class="leaderboard-score">${Math.round(player.avgScore)}</div>
            `;
            
            fragment.appendChild(leaderboardItem);
        });
        
        this.leaderboardList.innerHTML = '';
        this.leaderboardList.appendChild(fragment);
    }

    updatePlayersList(players = this.players) {
        if (!players || !Array.isArray(players)) return;
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        players.forEach((player) => {
            const playerItem = document.createElement('div');
            playerItem.className = `player-item ${player.isReady ? 'ready' : ''}`;
            
            playerItem.innerHTML = `
                <div class="player-name">${this.escapeHtml(player.name)}</div>
                <div class="player-status ${player.isReady ? 'status-ready' : 'status-waiting'}">
                    ${player.isReady ? '✓ Ready' : '⏳ Waiting'}
                </div>
            `;
            
            fragment.appendChild(playerItem);
        });
        
        // Single DOM update
        this.playersContainer.innerHTML = '';
        this.playersContainer.appendChild(fragment);

        // Update waiting message efficiently
        const allReady = players.length > 0 && players.every(p => p.isReady);
        this.waitingMessage.classList.toggle('hidden', allReady || !this.isReady);
    }

    updateScores() {
        // Placeholder for score updates - handled by server
        // Could be enhanced to show real-time score updates
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
        // Clear previous timeout
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
        }
        
        this.activityContent.textContent = message;
        this.liveActivity.classList.remove('hidden');
        
        this.activityTimeout = setTimeout(() => {
            this.liveActivity.classList.add('hidden');
        }, 2000);
    }

    showError(message) {
        // Create a simple toast notification instead of alert
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #dc3545;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 600;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }

    // Utility functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    playAgain() {
        this.resetPlayerState();
        this.showScreen('lobby');
        // Re-emit ready state if we were already ready
        setTimeout(() => {
            if (this.roomId) {
                this.socket.emit('ready-to-play');
                this.isReady = true;
                this.readyBtn.textContent = 'Ready!';
                this.readyBtn.disabled = true;
                this.readyBtn.style.background = '#28a745';
                this.readyBtn.style.color = 'white';
            }
        }, 100);
    }

    backToMenu() {
        this.leaveRoom();
        this.resetPlayerState();
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
