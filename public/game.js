class TapRaceGame {
    constructor() {
        // Better socket initialization with Vercel compatibility
        this.socket = io({
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            maxReconnectionAttempts: 10
        });
        
        this.currentScreen = 'main-menu';
        this.roomId = null;
        this.playerName = null;
        this.gameState = 'waiting';
        this.isReady = false;
        this.canTap = false;
        this.players = [];
        this.activityTimeout = null;
        this.selectedGameMode = 'classic';
        
        // Initialize new systems
        this.soundManager = new SoundManager();
        this.powerUpSystem = new PowerUpSystem();
        this.achievementSystem = new AchievementSystem();
        
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
            leaderboard: document.getElementById('leaderboard'),
            achievements: document.getElementById('achievements'),
            tournament: document.getElementById('tournament')
        };

        // Main menu elements
        this.playerNameInput = document.getElementById('player-name');
        this.roomIdInput = document.getElementById('room-id');
        this.gameModeSelect = document.getElementById('game-mode');
        this.joinGameBtn = document.getElementById('join-game');
        this.viewLeaderboardBtn = document.getElementById('view-leaderboard');
        this.viewAchievementsBtn = document.getElementById('view-achievements');
        this.toggleSoundBtn = document.getElementById('toggle-sound');

        // Lobby elements
        this.currentRoomIdSpan = document.getElementById('current-room-id');
        this.lobbyGameModeSpan = document.getElementById('lobby-game-mode');
        this.playersContainer = document.getElementById('players-container');
        this.readyBtn = document.getElementById('ready-btn');
        this.leaveRoomBtn = document.getElementById('leave-room');
        this.waitingMessage = document.getElementById('waiting-message');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendChatBtn = document.getElementById('send-chat');

        // Game elements
        this.currentRoundSpan = document.getElementById('current-round');
        this.maxRoundsSpan = document.getElementById('max-rounds');
        this.gameScores = document.getElementById('game-scores');
        this.powerUpsContainer = document.getElementById('power-ups-container');
        this.tapZone = document.getElementById('tap-zone');
        this.tapCircle = document.getElementById('tap-circle');
        this.tapText = document.getElementById('tap-text');
        this.gameMessage = document.getElementById('game-message');
        this.activePowerupsContainer = document.getElementById('active-powerups');
        this.roundResults = document.getElementById('round-results');
        this.roundResultsList = document.getElementById('round-results-list');

        // Final results elements
        this.finalResultsList = document.getElementById('final-results-list');
        this.playAgainBtn = document.getElementById('play-again');
        this.backToMenuBtn = document.getElementById('back-to-menu');

        // Leaderboard elements
        this.leaderboardList = document.getElementById('leaderboard-list');
        this.backFromLeaderboardBtn = document.getElementById('back-from-leaderboard');

        // Achievements elements
        this.achievementsList = document.getElementById('achievements-list');
        this.backFromAchievementsBtn = document.getElementById('back-from-achievements');

        // Live activity and notifications
        this.liveActivity = document.getElementById('live-activity');
        this.activityContent = document.getElementById('activity-content');
        this.achievementNotification = document.getElementById('achievement-notification');
        this.powerupNotification = document.getElementById('powerup-notification');
    }

    setupEventListeners() {
        // Main menu
        this.joinGameBtn.addEventListener('click', () => this.joinGame());
        this.viewLeaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        this.viewAchievementsBtn.addEventListener('click', () => this.showAchievements());
        this.toggleSoundBtn.addEventListener('click', () => this.toggleSound());
        
        // Game mode selection
        this.gameModeSelect.addEventListener('change', (e) => {
            this.selectedGameMode = e.target.value;
        });
        
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
        
        // Chat
        this.sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Game
        this.tapZone.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleTap();
        });
        this.tapZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleTap();
        });
        this.tapZone.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        this.tapZone.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        // Final results
        this.playAgainBtn.addEventListener('click', () => this.playAgain());
        this.backToMenuBtn.addEventListener('click', () => this.backToMenu());

        // Leaderboard
        this.backFromLeaderboardBtn.addEventListener('click', () => this.backToMenu());
        
        // Achievements
        this.backFromAchievementsBtn.addEventListener('click', () => this.backToMenu());

        // Prevent context menu on tap zone
        this.tapZone.addEventListener('contextmenu', (e) => e.preventDefault());

        // Add global click handling for better compatibility
        document.addEventListener('click', (e) => {
            // Ensure clicks are registered properly
            if (e.target.tagName === 'BUTTON' || e.target.classList.contains('clickable')) {
                e.target.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 100);
            }
        });

        // Add better mobile support
        document.addEventListener('touchstart', () => {}, { passive: false });
        
        // Ensure iOS Safari compatibility
        document.addEventListener('DOMContentLoaded', () => {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
                document.body.style.cursor = 'pointer';
                // Add click handlers to all buttons for better iOS support
                const buttons = document.querySelectorAll('button, .clickable');
                buttons.forEach(btn => {
                    btn.style.cursor = 'pointer';
                    btn.style.webkitTouchCallout = 'none';
                    btn.style.webkitUserSelect = 'none';
                });
            }
        });
    }

    setupSocketListeners() {
        this.socket.on('joined-room', (data) => {
            this.roomId = data.roomId;
            this.currentRoomIdSpan.textContent = data.roomId;
            if (this.lobbyGameModeSpan && data.gameMode) {
                // Simple mode display
                const modes = {
                    classic: 'Classic',
                    blitz: 'Blitz', 
                    powerUp: 'Power-Up',
                    elimination: 'Elimination',
                    marathon: 'Marathon',
                    precision: 'Precision'
                };
                this.lobbyGameModeSpan.textContent = modes[data.gameMode] || 'Classic';
            }
            this.players = data.players || [];
            this.debouncedUpdatePlayers();
            this.showScreen('lobby');
            if (this.soundManager) {
                this.soundManager.play('notification');
            }
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

        this.socket.on('chat-message', (data) => {
            this.displayChatMessage(data);
            if (this.soundManager) {
                this.soundManager.play('notification');
            }
        });

        this.socket.on('powerups', (data) => {
            this.displayPowerUps(data);
        });

        this.socket.on('active-powerups', (data) => {
            this.updateActivePowerUps(data);
        });

        this.socket.on('achievement-unlocked', (data) => {
            this.showAchievementNotification(data.achievement);
        });

        this.socket.on('powerup-activated', (data) => {
            if (this.soundManager) {
                this.soundManager.play('powerup');
            }
            this.showLiveActivity(`Power-up activated: ${data.powerUp.name}`);
        });

        // Add connection monitoring
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.showConnectionStatus('Connected', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showConnectionStatus('Disconnected', 'error');
        });

        this.socket.on('reconnect', () => {
            console.log('Reconnected to server');
            this.showConnectionStatus('Reconnected', 'success');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.showConnectionStatus('Connection Failed', 'error');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            if (typeof error === 'string') {
                this.showNotification(error, 'error');
            }
        });
    }

    joinGame() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            this.showNotification('Please enter your name', 'error');
            this.playerNameInput.focus();
            return;
        }

        if (playerName.length > 20) {
            this.showNotification('Name must be 20 characters or less', 'error');
            this.playerNameInput.focus();
            return;
        }

        // Check socket connection
        if (!this.socket.connected) {
            this.showNotification('Not connected to server. Please wait...', 'error');
            return;
        }

        this.playerName = playerName;
        const roomId = this.roomIdInput.value.trim() || this.generateRoomId();

        console.log('Joining room:', roomId, 'as', playerName);
        
        this.socket.emit('join-room', {
            roomId: roomId,
            playerName: playerName,
            gameMode: this.selectedGameMode
        });
        
        // Show loading state
        this.joinGameBtn.disabled = true;
        this.joinGameBtn.textContent = 'Joining...';
        
        // Re-enable button after timeout
        setTimeout(() => {
            this.joinGameBtn.disabled = false;
            this.joinGameBtn.textContent = 'Join Game';
        }, 5000);
        
        this.soundManager.play('notification');
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

    showConnectionStatus(message, type) {
        let statusDiv = document.getElementById('connection-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'connection-status';
            statusDiv.style.cssText = `
                position: fixed;
                top: 10px;
                left: 10px;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                z-index: 10001;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusDiv);
        }
        
        statusDiv.textContent = message;
        statusDiv.className = type;
        
        if (type === 'success') {
            statusDiv.style.backgroundColor = '#10B981';
            statusDiv.style.color = 'white';
        } else if (type === 'error') {
            statusDiv.style.backgroundColor = '#EF4444';
            statusDiv.style.color = 'white';
        }
        
        // Hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (statusDiv) {
                    statusDiv.style.opacity = '0';
                    setTimeout(() => {
                        if (statusDiv && statusDiv.parentNode) {
                            statusDiv.parentNode.removeChild(statusDiv);
                        }
                    }, 300);
                }
            }, 3000);
        }
    }

    showNotification(message, type = 'info') {
        let notificationDiv = document.getElementById('notification');
        if (!notificationDiv) {
            notificationDiv = document.createElement('div');
            notificationDiv.id = 'notification';
            notificationDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                padding: 20px;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                z-index: 10002;
                max-width: 300px;
                text-align: center;
                box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(notificationDiv);
        }
        
        notificationDiv.textContent = message;
        
        if (type === 'error') {
            notificationDiv.style.backgroundColor = '#FEE2E2';
            notificationDiv.style.color = '#B91C1C';
            notificationDiv.style.border = '2px solid #F87171';
        } else {
            notificationDiv.style.backgroundColor = '#DBEAFE';
            notificationDiv.style.color = '#1E40AF';
            notificationDiv.style.border = '2px solid #60A5FA';
        }
        
        notificationDiv.style.display = 'block';
        notificationDiv.style.opacity = '1';
        
        setTimeout(() => {
            if (notificationDiv) {
                notificationDiv.style.opacity = '0';
                setTimeout(() => {
                    if (notificationDiv && notificationDiv.parentNode) {
                        notificationDiv.parentNode.removeChild(notificationDiv);
                    }
                }, 300);
            }
        }, 4000);
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

    showAchievements() {
        this.displayAchievements();
        this.showScreen('achievements');
    }

    toggleSound() {
        const isEnabled = this.soundManager.toggle();
        this.toggleSoundBtn.textContent = isEnabled ? 'ON' : 'OFF';
        this.toggleSoundBtn.classList.toggle('active', isEnabled);
        if (this.soundManager) {
            this.soundManager.play('notification');
        }
    }

    sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (message && this.roomId) {
            this.socket.emit('chat-message', {
                roomId: this.roomId,
                message: message,
                playerName: this.playerName
            });
            this.chatInput.value = '';
        }
    }

    displayChatMessage(data) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <span class="sender">${this.escapeHtml(data.playerName)}:</span>
            ${this.escapeHtml(data.message)}
        `;
        
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    displayAchievements() {
        // Simple achievements display for demo
        const achievements = [
            { name: 'First Victory', description: 'Win your first game', icon: '🏆', unlocked: true },
            { name: 'Speed Demon', description: 'React in under 150ms', icon: '⚡', unlocked: false },
            { name: 'Perfect Round', description: 'Win all rounds in a game', icon: '💯', unlocked: false }
        ];
        
        this.achievementsList.innerHTML = '';
        
        achievements.forEach(achievement => {
            const achievementElement = document.createElement('div');
            achievementElement.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            
            achievementElement.innerHTML = `
                <div class="achievement-item-icon">${achievement.icon}</div>
                <div class="achievement-item-info">
                    <div class="achievement-item-name">${achievement.name}</div>
                    <div class="achievement-item-desc">${achievement.description}</div>
                </div>
            `;
            
            this.achievementsList.appendChild(achievementElement);
        });
    }

    updateActivePowerUps(activePowerUps) {
        this.activePowerupsContainer.innerHTML = '';
        
        activePowerUps.forEach(powerUp => {
            const element = document.createElement('div');
            element.className = 'active-powerup';
            
            const timeLeft = Math.ceil((powerUp.endTime - Date.now()) / 1000);
            
            element.innerHTML = `
                <span>${powerUp.icon}</span>
                <span>${powerUp.name}</span>
                <span class="powerup-timer">${timeLeft}s</span>
            `;
            
            this.activePowerupsContainer.appendChild(element);
        });
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TapRaceGame();
});
