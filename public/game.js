class TapRaceGame {
    constructor() {
        // Railway deployment socket configuration
        const socketUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000'
            : 'https://tapchamps-production.up.railway.app';
            
        this.socket = io(socketUrl, {
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
        this.playerProfile = new PlayerProfile();
        this.spectatorMode = new SpectatorMode(this);
        this.gameAnalytics = new GameAnalytics();
        this.matchmaking = new MatchmakingSystem();
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSocketListeners();
        
        // Debounced functions for performance
        this.debouncedUpdatePlayers = this.debounce(this.updatePlayersList.bind(this), 100);
        
        // Initialize profile system
        this.initializeProfileSystem();
    }
    
    initializeProfileSystem() {
        // Show profile creation if user doesn't have a profile
        setTimeout(() => {
            if (!this.playerProfile.isProfileComplete()) {
                this.playerProfile.showProfileCreation();
            } else {
                // Auto-fill name inputs with profile data
                this.autoFillProfileData();
            }
        }, 1000);
    }
    
    autoFillProfileData() {
        if (this.playerProfile.isProfileComplete()) {
            const displayName = this.playerProfile.getDisplayName();
            if (this.playerNameJoinInput && !this.playerNameJoinInput.value) {
                this.playerNameJoinInput.value = displayName;
            }
            if (this.playerNameCreateInput && !this.playerNameCreateInput.value) {
                this.playerNameCreateInput.value = displayName;
            }
        }
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
        this.playerNameJoinInput = document.getElementById('player-name-join');
        this.playerNameCreateInput = document.getElementById('player-name-create');
        this.roomIdInput = document.getElementById('room-id');
        this.joinRoomPasswordInput = document.getElementById('join-room-password');
        this.createRoomPasswordInput = document.getElementById('create-room-password');
        this.gameModeSelect = document.getElementById('game-mode');
        
        // Main action buttons
        this.joinGameBtn = document.getElementById('join-game-btn');
        this.createGameBtn = document.getElementById('create-game-btn');
        this.confirmJoinBtn = document.getElementById('confirm-join');
        this.confirmCreateBtn = document.getElementById('confirm-create');
        this.cancelJoinBtn = document.getElementById('cancel-join');
        this.cancelCreateBtn = document.getElementById('cancel-create');
        
        // Secondary buttons
        this.viewLeaderboardBtn = document.getElementById('view-leaderboard');
        this.viewAchievementsBtn = document.getElementById('view-achievements');
        this.viewProfileBtn = document.getElementById('view-profile');
        this.spectateBtn = document.getElementById('spectate-btn');
        this.toggleSoundBtn = document.getElementById('toggle-sound');
        
        // UI sections
        this.joinGameSection = document.getElementById('join-game-section');
        this.createGameSection = document.getElementById('create-game-section');
        this.secondaryActions = document.getElementById('secondary-actions');
        this.mainActions = document.querySelector('.main-actions');

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
        // CRITICAL: Universal click handler for Vercel compatibility
        const addUniversalClickHandler = (element, handler) => {
            if (!element) {
                console.warn('Element not found for click handler');
                return;
            }
            
            const safeHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked:', element.id || element.className);
                handler(e);
            };
            
            // Add multiple event listeners for different scenarios
            element.addEventListener('click', safeHandler, { passive: false });
            element.addEventListener('touchstart', safeHandler, { passive: false });
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
            
            // Force element to be interactive
            element.style.pointerEvents = 'auto';
            element.style.cursor = 'pointer';
            element.style.touchAction = 'manipulation';
            element.style.webkitTouchCallout = 'none';
            element.style.position = 'relative';
            element.style.zIndex = '10';
        };

        // Main menu navigation
        addUniversalClickHandler(this.joinGameBtn, () => this.showJoinGameSection());
        addUniversalClickHandler(this.createGameBtn, () => this.showCreateGameSection());
        addUniversalClickHandler(this.cancelJoinBtn, () => this.showMainMenu());
        addUniversalClickHandler(this.cancelCreateBtn, () => this.showMainMenu());
        
        // Game actions
        addUniversalClickHandler(this.confirmJoinBtn, () => this.joinExistingGame());
        addUniversalClickHandler(this.confirmCreateBtn, () => this.createNewGame());
        
        // Secondary actions
        addUniversalClickHandler(this.viewLeaderboardBtn, () => this.showLeaderboard());
        addUniversalClickHandler(this.viewAchievementsBtn, () => this.showAchievements());
        addUniversalClickHandler(this.viewProfileBtn, () => this.playerProfile.showProfile());
        addUniversalClickHandler(this.spectateBtn, () => this.toggleSpectateSection());
        addUniversalClickHandler(this.toggleSoundBtn, () => this.toggleSound());
        
        // Game mode selection
        this.gameModeSelect.addEventListener('change', (e) => {
            this.selectedGameMode = e.target.value;
        });
        
        // Allow Enter key navigation
        this.playerNameJoinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.roomIdInput.focus();
        });
        
        this.playerNameCreateInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmCreateBtn.click();
        });
        
        this.roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmJoinBtn.click();
        });
        
        this.joinRoomPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmJoinBtn.click();
        });
        
        this.createRoomPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.confirmCreateBtn.click();
        });

        // Lobby
        addUniversalClickHandler(this.readyBtn, () => this.toggleReady());
        addUniversalClickHandler(this.leaveRoomBtn, () => this.leaveRoom());
        
        // Chat
        addUniversalClickHandler(this.sendChatBtn, () => this.sendChatMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });

        // Game - CRITICAL: Tap zone with maximum compatibility
        addUniversalClickHandler(this.tapZone, () => this.handleTap());

        // Final results
        addUniversalClickHandler(this.playAgainBtn, () => this.playAgain());
        addUniversalClickHandler(this.backToMenuBtn, () => this.backToMenu());

        // Leaderboard
        addUniversalClickHandler(this.backFromLeaderboardBtn, () => this.backToMenu());
        
        // Achievements
        addUniversalClickHandler(this.backFromAchievementsBtn, () => this.backToMenu());

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

    // UI Navigation Methods
    showJoinGameSection() {
        this.joinGameSection.classList.remove('hidden');
        this.createGameSection.classList.add('hidden');
        this.secondaryActions.style.display = 'none';
        this.mainActions.style.display = 'none';
    }

    showCreateGameSection() {
        this.createGameSection.classList.remove('hidden');
        this.joinGameSection.classList.add('hidden');
        this.secondaryActions.style.display = 'none';
        this.mainActions.style.display = 'none';
    }

    showMainMenu() {
        this.joinGameSection.classList.add('hidden');
        this.createGameSection.classList.add('hidden');
        this.secondaryActions.style.display = 'block';
        this.mainActions.style.display = 'grid';
    }

    // Game Action Methods
    joinExistingGame() {
        let playerName = this.playerNameJoinInput.value.trim();
        const roomId = this.roomIdInput.value.trim();
        const password = this.joinRoomPasswordInput.value.trim();
        
        // Auto-fill from profile if available and input is empty
        if (!playerName && this.playerProfile.isProfileComplete()) {
            playerName = this.playerProfile.getDisplayName();
            this.playerNameJoinInput.value = playerName;
        }
        
        if (!playerName) {
            this.showNotification('Please enter your name', 'error');
            this.playerNameJoinInput.focus();
            return;
        }
        
        if (!roomId) {
            this.showNotification('Please enter a Room ID', 'error');
            this.roomIdInput.focus();
            return;
        }
        
        if (playerName.length > 20) {
            this.showNotification('Name must be 20 characters or less', 'error');
            this.playerNameJoinInput.focus();
            return;
        }

        // Check socket connection
        if (!this.socket.connected) {
            this.showNotification('Not connected to server. Please wait...', 'error');
            return;
        }

        this.playerName = playerName;
        console.log('Joining existing room:', roomId, 'as', playerName);
        
        // Include profile data if available
        const joinData = {
            playerName,
            roomId,
            password: password || null,
            gameMode: 'classic', // Default for joining existing rooms
            profileData: this.playerProfile.isProfileComplete() ? this.playerProfile.getPublicProfile() : null
        };
        
        this.socket.emit('join-room', joinData);
    }

    createNewGame() {
        let playerName = this.playerNameCreateInput.value.trim();
        const gameMode = this.gameModeSelect.value;
        const password = this.createRoomPasswordInput.value.trim();
        
        // Auto-fill from profile if available and input is empty
        if (!playerName && this.playerProfile.isProfileComplete()) {
            playerName = this.playerProfile.getDisplayName();
            this.playerNameCreateInput.value = playerName;
        }
        
        if (!playerName) {
            this.showNotification('Please enter your name', 'error');
            this.playerNameCreateInput.focus();
            return;
        }
        
        if (playerName.length > 20) {
            this.showNotification('Name must be 20 characters or less', 'error');
            this.playerNameCreateInput.focus();
            return;
        }

        // Check socket connection
        if (!this.socket.connected) {
            this.showNotification('Not connected to server. Please wait...', 'error');
            return;
        }

        this.playerName = playerName;
        const roomId = this.generateRoomId();
        console.log('Creating new room:', roomId, 'as', playerName, 'mode:', gameMode);
        
        // Include profile data if available
        const createData = {
            playerName,
            roomId,
            password: password || null,
            gameMode,
            profileData: this.playerProfile.isProfileComplete() ? this.playerProfile.getPublicProfile() : null
        };
        
        this.socket.emit('join-room', createData);
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
            gameMode: this.selectedGameMode,
            password: this.roomPasswordInput.value.trim() || null
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

        // Check achievements for the current player
        const currentPlayerResult = results.find(r => r.name === this.playerName);
        if (currentPlayerResult) {
            this.checkAndShowAchievements(currentPlayerResult, results);
        }

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

    checkAndShowAchievements(playerResult, allResults) {
        // Get or create player stats
        const playerId = 'player_' + this.playerName; // Simple ID based on name
        let playerStats = JSON.parse(localStorage.getItem('tapChamps_playerStats')) || {
            gamesPlayed: 0,
            gamesWon: 0,
            perfectGames: 0,
            winStreak: 0,
            bestReactionTime: Infinity,
            powerUpsUsed: 0
        };

        // Update stats based on current game
        playerStats.gamesPlayed++;
        
        if (playerResult.rank === 1) {
            playerStats.gamesWon++;
            playerStats.winStreak++;
            
            // Check if all rounds were won (perfect game)
            if (allResults.length > 1 && playerResult.rank === 1) {
                // This is a simplified check - in a real game you'd track round wins
                playerStats.perfectGames++;
            }
        } else {
            playerStats.winStreak = 0;
        }

        if (playerResult.avgReactionTime < playerStats.bestReactionTime) {
            playerStats.bestReactionTime = playerResult.avgReactionTime;
        }

        // Save updated stats
        localStorage.setItem('tapChamps_playerStats', JSON.stringify(playerStats));

        // Check for new achievements
        const newAchievements = this.achievementSystem.checkAchievements(playerId, playerStats);
        
        // Show achievement notifications
        newAchievements.forEach((achievement, index) => {
            setTimeout(() => {
                this.showAchievementNotification(achievement);
            }, index * 2000); // Stagger notifications
        });
    }

    showAchievementNotification(achievement) {
        // Create achievement notification
        const notification = document.createElement('div');
        notification.className = 'achievement-notification show';
        notification.innerHTML = `
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <div>
                    <div class="achievement-title">Achievement Unlocked!</div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-desc">${achievement.description}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Play sound
        if (this.soundManager) {
            this.soundManager.play('achievement');
        }
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 4000);
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
                <div class="player-name clickable-player-name" data-player-id="${player.id || player.name}">${this.escapeHtml(player.name)}</div>
                <div class="player-status ${player.isReady ? 'status-ready' : 'status-waiting'}">
                    ${player.isReady ? '✓ Ready' : '⏳ Waiting'}
                </div>
            `;
            
            // Add click handler for viewing player profile
            const playerNameElement = playerItem.querySelector('.clickable-player-name');
            if (playerNameElement && player.name !== this.playerProfile.getDisplayName()) {
                playerNameElement.addEventListener('click', () => {
                    this.showPlayerProfile(player);
                });
            }
            
            fragment.appendChild(playerItem);
        });
        
        // Single DOM update
        this.playersContainer.innerHTML = '';
        this.playersContainer.appendChild(fragment);

        // Update waiting message efficiently
        const allReady = players.length > 0 && players.every(p => p.isReady);
        this.waitingMessage.classList.toggle('hidden', allReady || !this.isReady);
    }

    showPlayerProfile(player) {
        // Create or show player profile modal
        let playerProfileModal = document.getElementById('other-player-profile-modal');
        
        if (!playerProfileModal) {
            // Create the modal if it doesn't exist
            playerProfileModal = document.createElement('div');
            playerProfileModal.id = 'other-player-profile-modal';
            playerProfileModal.className = 'modal';
            playerProfileModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Player Profile</h2>
                        <button id="close-other-player-profile" class="close-btn">&times;</button>
                    </div>
                    <div class="profile-content">
                        <div class="profile-main">
                            <div class="player-avatar-large" id="other-player-avatar">👤</div>
                            <div class="player-info">
                                <div class="profile-display-name" id="other-player-display-name">Player Name</div>
                                <div class="profile-username" id="other-player-username">@username</div>
                                <div class="profile-bio" id="other-player-bio">Bio goes here</div>
                            </div>
                        </div>
                        <div class="profile-level-section">
                            <div class="player-title" id="other-player-title">Title</div>
                            <div class="player-level" id="other-player-level">Level 1</div>
                        </div>
                        <div class="profile-stats">
                            <h3>Statistics</h3>
                            <div id="other-player-stats" class="stats-grid"></div>
                        </div>
                        <div class="profile-badges">
                            <h3>Badges</h3>
                            <div id="other-player-badges" class="badges-grid"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(playerProfileModal);
            
            // Add close handler
            const closeBtn = playerProfileModal.querySelector('#close-other-player-profile');
            closeBtn.addEventListener('click', () => {
                playerProfileModal.classList.remove('show');
            });
            
            // Close on outside click
            playerProfileModal.addEventListener('click', (e) => {
                if (e.target === playerProfileModal) {
                    playerProfileModal.classList.remove('show');
                }
            });
        }
        
        // Update profile data
        this.updateOtherPlayerProfile(player);
        
        // Show modal
        playerProfileModal.classList.add('show');
    }

    updateOtherPlayerProfile(player) {
        // Update avatar
        const avatarElement = document.getElementById('other-player-avatar');
        if (avatarElement) {
            if (player.profile && player.profile.isCustomAvatar && player.profile.avatar && player.profile.avatar.startsWith('data:')) {
                avatarElement.innerHTML = `<img src="${player.profile.avatar}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                avatarElement.textContent = player.profile?.avatar || '👤';
                avatarElement.innerHTML = player.profile?.avatar || '👤';
            }
        }
        
        // Update name and info
        const displayNameElement = document.getElementById('other-player-display-name');
        const usernameElement = document.getElementById('other-player-username');
        const bioElement = document.getElementById('other-player-bio');
        const titleElement = document.getElementById('other-player-title');
        const levelElement = document.getElementById('other-player-level');
        
        if (displayNameElement) {
            displayNameElement.textContent = player.profile?.displayName || player.name || 'Anonymous';
        }
        if (usernameElement) {
            usernameElement.textContent = `@${player.profile?.username || 'anonymous'}`;
        }
        if (bioElement) {
            bioElement.textContent = player.profile?.bio || 'No bio set';
        }
        if (titleElement) {
            titleElement.textContent = player.profile?.title || 'Rookie Tapper';
        }
        if (levelElement) {
            levelElement.textContent = `Level ${player.profile?.level || 1}`;
        }
        
        // Update stats
        const statsElement = document.getElementById('other-player-stats');
        if (statsElement && player.profile) {
            const winRate = player.profile.totalGamesPlayed > 0 
                ? ((player.profile.totalWins / player.profile.totalGamesPlayed) * 100).toFixed(1)
                : 0;
            
            const playTimeHours = Math.floor((player.profile.totalPlayTime || 0) / 3600);
            const playTimeMinutes = Math.floor(((player.profile.totalPlayTime || 0) % 3600) / 60);

            statsElement.innerHTML = `
                <div class="stat-item">
                    <div class="stat-value">${player.profile.totalGamesPlayed || 0}</div>
                    <div class="stat-label">Games Played</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${player.profile.totalWins || 0}</div>
                    <div class="stat-label">Games Won</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${winRate}%</div>
                    <div class="stat-label">Win Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${player.profile.bestStreak || 0}</div>
                    <div class="stat-label">Best Streak</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${playTimeHours}h ${playTimeMinutes}m</div>
                    <div class="stat-label">Play Time</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${player.profile.favoriteMode || 'classic'}</div>
                    <div class="stat-label">Favorite Mode</div>
                </div>
            `;
        }
        
        // Update badges
        const badgesElement = document.getElementById('other-player-badges');
        if (badgesElement && player.profile) {
            const badges = [];
            if ((player.profile.level || 1) >= 5) badges.push({ name: 'Fast Learner', icon: '🚀' });
            if ((player.profile.totalWins || 0) >= 10) badges.push({ name: 'Winner', icon: '🏆' });
            if ((player.profile.bestStreak || 0) >= 5) badges.push({ name: 'Streak Master', icon: '🔥' });
            if ((player.profile.totalGamesPlayed || 0) >= 50) badges.push({ name: 'Dedicated', icon: '💎' });

            badgesElement.innerHTML = badges.length > 0 
                ? badges.map(badge => `
                    <div class="badge-item">
                        <div class="badge-icon">${badge.icon}</div>
                        <div class="badge-name">${badge.name}</div>
                    </div>
                `).join('')
                : '<div class="no-badges">No badges earned yet</div>';
        }
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
        
        // Format timestamp
        const timestamp = new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.innerHTML = `
            <span class="sender">${this.escapeHtml(data.playerName)}:</span>
            ${this.escapeHtml(data.message)}
            <span class="timestamp">${timestamp}</span>
        `;
        
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    displayAchievements() {
        // Get player stats and achievements
        const playerId = 'player_' + (this.playerName || 'anonymous');
        const playerStats = JSON.parse(localStorage.getItem('tapChamps_playerStats')) || {
            gamesPlayed: 0,
            gamesWon: 0,
            perfectGames: 0,
            winStreak: 0,
            bestReactionTime: Infinity,
            powerUpsUsed: 0
        };

        // Get all achievements and their unlock status
        const allAchievements = Object.entries(this.achievementSystem.achievements).map(([id, achievement]) => {
            const unlocked = achievement.condition(playerStats);
            return {
                id,
                name: achievement.name,
                description: achievement.description,
                icon: achievement.icon,
                unlocked
            };
        });
        
        this.achievementsList.innerHTML = '';
        
        allAchievements.forEach(achievement => {
            const achievementElement = document.createElement('div');
            achievementElement.className = `achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`;
            
            achievementElement.innerHTML = `
                <div class="achievement-item-icon">${achievement.icon}</div>
                <div class="achievement-item-info">
                    <div class="achievement-item-name">${achievement.name}</div>
                    <div class="achievement-item-desc">${achievement.description}</div>
                    <div class="achievement-status">${achievement.unlocked ? '✅ Unlocked' : '🔒 Locked'}</div>
                </div>
            `;
            
            this.achievementsList.appendChild(achievementElement);
        });
    }

    toggleSpectateSection() {
        const spectateSection = document.getElementById('spectate-section');
        if (spectateSection) {
            spectateSection.classList.toggle('hidden');
        }
    }

    // Enhanced game result handling with profile updates
    handleGameComplete(results) {
        const playerResult = results.find(r => r.playerId === this.socket.id);
        if (playerResult) {
            // Update player profile
            const gameResult = {
                won: playerResult.rank === 1,
                currentStreak: this.calculateStreak(playerResult),
                gameDuration: this.calculateGameDuration(),
                rank: playerResult.rank,
                totalPlayers: results.length
            };
            
            this.playerProfile.updateStats(gameResult);
        }
        
        // Existing achievement check
        this.checkAndShowAchievements(playerResult, results);
    }

    calculateStreak(playerResult) {
        // Simple streak calculation - in real implementation, track this on server
        return playerResult.rank === 1 ? 1 : 0;
    }

    calculateGameDuration() {
        // Estimate game duration based on rounds
        return this.currentRound * 15; // ~15 seconds per round average
    }

    // Performance optimization: Debounce tap handling
    handleTap() {
        if (!this.canTap || this.tapHandled) return;
        
        this.tapHandled = true;
        const reactionTime = Date.now() - this.roundStartTime;
        
        // Optimized: Single socket emit with all data
        this.socket.emit('tap', {
            roomId: this.roomId,
            reactionTime,
            round: this.currentRound,
            timestamp: Date.now()
        });
        
        // Visual feedback without blocking
        requestAnimationFrame(() => {
            this.provideTapFeedback(reactionTime);
        });
        
        // Reset tap handling after small delay to prevent double taps
        setTimeout(() => {
            this.tapHandled = false;
        }, 100);
    }

    provideTapFeedback(reactionTime) {
        if (this.tapCircle) {
            this.tapCircle.style.transform = 'scale(0.95)';
            this.tapCircle.style.background = this.getScoreColor(reactionTime);
            
            setTimeout(() => {
                this.tapCircle.style.transform = 'scale(1)';
            }, 150);
        }
    }

    getScoreColor(reactionTime) {
        if (reactionTime < 200) return 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)'; // Green
        if (reactionTime < 300) return 'linear-gradient(135deg, #FFC107 0%, #FF9800 100%)'; // Yellow
        if (reactionTime < 500) return 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)'; // Orange
        return 'linear-gradient(135deg, #F44336 0%, #E91E63 100%)'; // Red
    }

    // Enhanced activity feed with more details
    updateLiveActivity(activity) {
        if (!this.activityContent) return;
        
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const icon = this.getActivityIcon(activity.type);
        
        activityElement.innerHTML = `
            <span class="activity-icon">${icon}</span>
            <span class="activity-text">${activity.message}</span>
            <span class="activity-time">${timestamp}</span>
        `;
        
        this.activityContent.insertBefore(activityElement, this.activityContent.firstChild);
        
        // Keep only last 10 activities for performance
        while (this.activityContent.children.length > 10) {
            this.activityContent.removeChild(this.activityContent.lastChild);
        }
        
        // Auto-fade animation
        requestAnimationFrame(() => {
            activityElement.style.opacity = '1';
            activityElement.style.transform = 'translateX(0)';
        });
    }

    getActivityIcon(type) {
        const icons = {
            'join': '👋',
            'leave': '👋',
            'ready': '✅',
            'win': '🏆',
            'achievement': '🏅',
            'powerup': '⚡',
            'fast': '💨',
            'slow': '🐌'
        };
        return icons[type] || '📢';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    // CRITICAL: Force all interactive elements to be clickable on Vercel
    const forceInteractivity = () => {
        const interactiveSelectors = [
            'button', 
            '.btn', 
            '.button',
            '[role="button"]',
            'input[type="button"]',
            'input[type="submit"]',
            '.clickable'
        ];
        
        interactiveSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.pointerEvents = 'auto';
                element.style.cursor = 'pointer';
                element.style.touchAction = 'manipulation';
                element.style.webkitTouchCallout = 'none';
                element.style.webkitUserSelect = 'none';
                element.style.userSelect = 'none';
                element.style.position = 'relative';
                element.style.zIndex = '10';
                
                console.log('Made interactive:', element.id || element.className);
            });
        });
    };
    
    // Force interactivity immediately and after a delay
    forceInteractivity();
    setTimeout(forceInteractivity, 100);
    setTimeout(forceInteractivity, 500);
    
    // Initialize the game
    window.tapRaceGame = new TapRaceGame();
    console.log('TapRaceGame initialized');
});
