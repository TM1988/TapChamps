// Enhanced Player Profile and User Account System
class PlayerProfile {
    constructor() {
        // Initialize profile system properties
        this.selectedAvatar = null;
        this.isCustomAvatar = false;
        
        this.profileData = this.loadProfile();
        this.initializeElements();
        this.setupEventListeners();
        this.presetAvatars = [
            '😀', '😎', '🤩', '😇', '🥳', '🤓', '😈', '👽', 
            '🤖', '👑', '🎭', '🎪', '🎨', '🎯', '🎮', '🕹️',
            '⚡', '🔥', '💎', '🌟', '👾', '🦄', '🐱', '🐶',
            '🦊', '🐸', '🐙', '🦜', '🌈', '💫', '🔮', '✨'
        ];
        this.initializeProfileCreation();
    }

    initializeElements() {
        // Profile modal elements (matching HTML IDs)
        this.profileModal = document.getElementById('profile-modal');
        this.profileButton = document.getElementById('view-profile');
        this.closeProfileBtn = document.getElementById('close-profile');
        
        // Profile creation elements (matching HTML IDs)
        this.createProfileModal = document.getElementById('profile-creation-modal');
        this.profileForm = document.getElementById('profile-creation-form');
        this.usernameInput = document.getElementById('profile-username');
        this.displayNameInput = document.getElementById('profile-display-name');
        this.bioInput = document.getElementById('profile-bio');
        this.skipProfileBtn = document.getElementById('skip-profile-creation');
        
        // Avatar selection elements
        this.presetAvatars = document.getElementById('preset-avatars');
        this.customAvatarInput = document.getElementById('custom-avatar-input');
        this.customAvatarPreview = document.getElementById('custom-avatar-preview');
        
        // Display elements (matching HTML IDs)
        this.playerAvatar = document.getElementById('player-avatar');
        this.playerTitle = document.getElementById('player-title');
        this.playerLevel = document.getElementById('player-level');
        this.playerXP = document.getElementById('player-xp');
        this.xpBar = document.getElementById('xp-bar');
        this.statsContainer = document.getElementById('stats-container');
        this.badgesContainer = document.getElementById('badges-container');
    }

    setupEventListeners() {
        // Profile modal events
        if (this.closeProfileBtn) {
            this.closeProfileBtn.addEventListener('click', () => this.hideProfile());
        }
        
        // Profile creation events
        if (this.profileForm) {
            this.profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveNewProfile();
            });
        }
        
        if (this.skipProfileBtn) {
            this.skipProfileBtn.addEventListener('click', () => this.hideProfileCreation());
        }
        
        // Avatar selection events
        if (this.presetAvatars) {
            this.presetAvatars.addEventListener('click', (e) => {
                if (e.target.classList.contains('avatar-option')) {
                    this.selectPresetAvatar(e.target.dataset.avatar);
                }
            });
        }
        
        if (this.customAvatarPreview) {
            this.customAvatarPreview.addEventListener('click', () => {
                this.customAvatarInput?.click();
            });
        }
        
        if (this.customAvatarInput) {
            this.customAvatarInput.addEventListener('change', (e) => {
                this.handleCustomAvatarUpload(e);
            });
        }
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target === this.profileModal) {
                this.hideProfile();
            }
            if (e.target === this.createProfileModal) {
                this.hideProfileCreation();
            }
        });
    }

    initializeProfileCreation() {
        this.setupAvatarSelector();
        
        // Show create profile if no profile exists
        if (!this.profileData.username) {
            setTimeout(() => this.showCreateProfile(), 500);
        }
    }

    setupAvatarSelector() {
        if (!this.avatarSelector) return;
        
        this.avatarSelector.innerHTML = '';
        this.presetAvatars.forEach(avatar => {
            const avatarOption = document.createElement('div');
            avatarOption.className = 'avatar-option';
            avatarOption.textContent = avatar;
            avatarOption.addEventListener('click', () => this.selectAvatar(avatar));
            this.avatarSelector.appendChild(avatarOption);
        });
    }

    selectAvatar(avatar) {
        // Remove previous selection
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Select new avatar
        event.target.classList.add('selected');
        if (this.selectedAvatarDisplay) {
            this.selectedAvatarDisplay.textContent = avatar;
        }
        this.selectedAvatar = avatar;
    }

    handleCustomAvatar(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        // Validate file size (max 1MB)
        if (file.size > 1024 * 1024) {
            alert('Image must be smaller than 1MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            this.selectedAvatar = imageData;
            if (this.selectedAvatarDisplay) {
                this.selectedAvatarDisplay.innerHTML = `<img src="${imageData}" alt="Custom Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">`;
            }
            
            // Clear preset selection
            document.querySelectorAll('.avatar-option').forEach(option => {
                option.classList.remove('selected');
            });
        };
        reader.readAsDataURL(file);
    }

    loadProfile() {
        const defaultProfile = {
            username: '',
            displayName: '',
            bio: '',
            avatar: '👤',
            isCustomAvatar: false,
            level: 1,
            xp: 0,
            totalGamesPlayed: 0,
            totalWins: 0,
            bestStreak: 0,
            totalPlayTime: 0,
            favoriteMode: 'classic',
            title: 'Rookie Tapper',
            badges: [],
            friendsList: [],
            preferences: {
                soundEnabled: true,
                showSkillRating: true,
                allowSpectators: true
            },
            createdAt: new Date().toISOString(),
            lastPlayed: new Date().toISOString()
        };
        
        const saved = localStorage.getItem('tapChamps_profile');
        return saved ? { ...defaultProfile, ...JSON.parse(saved) } : defaultProfile;
    }

    saveProfile() {
        this.profileData.lastPlayed = new Date().toISOString();
        localStorage.setItem('tapChamps_profile', JSON.stringify(this.profileData));
    }

    saveNewProfile() {
        const username = this.usernameInput?.value.trim();
        const displayName = this.displayNameInput?.value.trim();
        const bio = this.bioInput?.value.trim();
        
        if (!username) {
            alert('Username is required');
            return;
        }
        
        if (username.length < 3 || username.length > 20) {
            alert('Username must be between 3 and 20 characters');
            return;
        }
        
        if (displayName && displayName.length > 30) {
            alert('Display name must be 30 characters or less');
            return;
        }
        
        if (bio && bio.length > 150) {
            alert('Bio must be 150 characters or less');
            return;
        }
        
        // Check if username is unique (in real app, check with server)
        const existingProfile = localStorage.getItem('tapChamps_profiles_' + username);
        if (existingProfile && existingProfile !== this.profileData.username) {
            alert('Username already taken. Please choose another.');
            return;
        }
        
        // Update profile data
        this.profileData.username = username;
        this.profileData.displayName = displayName || username;
        this.profileData.bio = bio;
        this.profileData.avatar = this.selectedAvatar || this.profileData.avatar;
        this.profileData.isCustomAvatar = this.isCustomAvatar || (typeof this.selectedAvatar === 'string' && this.selectedAvatar.startsWith('data:'));
        
        if (!this.profileData.createdAt || this.profileData.createdAt === '') {
            this.profileData.createdAt = new Date().toISOString();
        }
        
        this.saveProfile();
        this.hideProfileCreation();
        this.updateDisplay();
        
        // Show success message
        alert('Profile created successfully! 🎉');
    }

    showCreateProfile() {
        if (this.createProfileModal) {
            this.createProfileModal.classList.add('show');
            this.setupAvatarSelector();
            
            // Pre-fill if editing existing profile
            if (this.profileData.username) {
                if (this.usernameInput) this.usernameInput.value = this.profileData.username;
                if (this.displayNameInput) this.displayNameInput.value = this.profileData.displayName;
                if (this.bioInput) this.bioInput.value = this.profileData.bio;
                this.selectAvatar(this.profileData.avatar);
            }
        }
    }

    hideCreateProfile() {
        if (this.createProfileModal) {
            this.createProfileModal.classList.remove('show');
        }
    }

    addXP(amount) {
        const oldLevel = this.profileData.level;
        this.profileData.xp += amount;
        
        // Level up calculation (100 XP per level, increasing by 50 each level)
        const xpNeeded = this.profileData.level * 100 + (this.profileData.level - 1) * 50;
        
        if (this.profileData.xp >= xpNeeded) {
            this.profileData.level++;
            this.profileData.xp -= xpNeeded;
            this.onLevelUp(oldLevel, this.profileData.level);
        }
        
        this.saveProfile();
        this.updateDisplay();
    }

    onLevelUp(oldLevel, newLevel) {
        // Show level up notification
        this.showLevelUpNotification(newLevel);
        
        // Unlock new titles and avatars
        this.checkForUnlocks(newLevel);
        
        // Play level up sound
        if (window.tapRaceGame && window.tapRaceGame.soundManager) {
            window.tapRaceGame.soundManager.play('achievement');
        }
    }

    showLevelUpNotification(level) {
        const notification = document.createElement('div');
        notification.className = 'level-up-notification show';
        notification.innerHTML = `
            <div class="level-up-content">
                <div class="level-up-icon">🎉</div>
                <div>
                    <div class="level-up-title">LEVEL UP!</div>
                    <div class="level-up-level">Level ${level}</div>
                    <div class="level-up-desc">You're getting better!</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type} show`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    checkForUnlocks(level) {
        const titles = {
            5: 'Quick Fingers',
            10: 'Reflex Master',
            15: 'Lightning Lord',
            20: 'Tap Champion',
            25: 'Speed Demon',
            30: 'Reaction God'
        };

        if (titles[level]) {
            this.profileData.title = titles[level];
            this.showNotification(`New title unlocked: ${titles[level]}! 🏆`, 'success');
        }
    }

    updateStats(gameResult) {
        this.profileData.totalGamesPlayed++;
        
        if (gameResult.won) {
            this.profileData.totalWins++;
            this.addXP(50); // Win bonus
        } else {
            this.addXP(10); // Participation XP
        }

        // Update best streak
        if (gameResult.currentStreak > this.profileData.bestStreak) {
            this.profileData.bestStreak = gameResult.currentStreak;
        }

        // Add playtime (approximate)
        this.profileData.totalPlayTime += gameResult.gameDuration || 60; // seconds

        this.saveProfile();
    }

    showProfile() {
        this.updateDisplay();
        if (this.profileModal) {
            this.profileModal.classList.add('show');
        }
    }

    hideProfile() {
        if (this.profileModal) {
            this.profileModal.classList.remove('show');
        }
    }

    updateDisplay() {
        // Update avatar display
        if (this.playerAvatar) {
            if (this.profileData.isCustomAvatar) {
                this.playerAvatar.innerHTML = `<img src="${this.profileData.avatar}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                this.playerAvatar.textContent = this.profileData.avatar;
                this.playerAvatar.innerHTML = this.profileData.avatar;
            }
        }
        
        if (this.playerTitle) this.playerTitle.textContent = this.profileData.title;
        if (this.playerLevel) this.playerLevel.textContent = `Level ${this.profileData.level}`;
        if (this.profileDisplayName) this.profileDisplayName.textContent = this.profileData.displayName;
        if (this.profileBio) this.profileBio.textContent = this.profileData.bio || 'No bio set';
        if (this.profileCreatedDate) {
            const createdDate = new Date(this.profileData.createdAt).toLocaleDateString();
            this.profileCreatedDate.textContent = `Member since ${createdDate}`;
        }
        
        // XP Bar
        const xpNeeded = this.profileData.level * 100 + (this.profileData.level - 1) * 50;
        const xpProgress = (this.profileData.xp / xpNeeded) * 100;
        
        if (this.playerXP) this.playerXP.textContent = `${this.profileData.xp}/${xpNeeded} XP`;
        if (this.xpBar) this.xpBar.style.width = `${xpProgress}%`;

        // Stats
        if (this.statsContainer) {
            const winRate = this.profileData.totalGamesPlayed > 0 
                ? ((this.profileData.totalWins / this.profileData.totalGamesPlayed) * 100).toFixed(1)
                : 0;
            
            const playTimeHours = Math.floor(this.profileData.totalPlayTime / 3600);
            const playTimeMinutes = Math.floor((this.profileData.totalPlayTime % 3600) / 60);

            this.statsContainer.innerHTML = `
                <div class="stat-item">
                    <div class="stat-value">${this.profileData.totalGamesPlayed}</div>
                    <div class="stat-label">Games Played</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.profileData.totalWins}</div>
                    <div class="stat-label">Games Won</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${winRate}%</div>
                    <div class="stat-label">Win Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.profileData.bestStreak}</div>
                    <div class="stat-label">Best Streak</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${playTimeHours}h ${playTimeMinutes}m</div>
                    <div class="stat-label">Play Time</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.profileData.favoriteMode}</div>
                    <div class="stat-label">Favorite Mode</div>
                </div>
            `;
        }
    }

    getDisplayName() {
        return this.profileData.displayName || this.profileData.username || 'Anonymous';
    }

    getUsername() {
        return this.profileData.username || 'anonymous';
    }

    getLevel() {
        return this.profileData.level;
    }

    getAvatar() {
        return this.profileData.avatar;
    }

    getAvatarDisplay() {
        if (this.profileData.isCustomAvatar) {
            return `<img src="${this.profileData.avatar}" alt="Avatar" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">`;
        } else {
            return this.profileData.avatar;
        }
    }

    isProfileComplete() {
        return this.profileData.username && this.profileData.username.length >= 3;
    }

    // Get profile data to send to other players
    getPublicProfile() {
        return {
            username: this.profileData.username,
            displayName: this.profileData.displayName,
            avatar: this.profileData.avatar,
            isCustomAvatar: this.profileData.isCustomAvatar,
            level: this.profileData.level,
            title: this.profileData.title,
            totalGamesPlayed: this.profileData.totalGamesPlayed,
            totalWins: this.profileData.totalWins
        };
    }

    addXP(amount) {
        const oldLevel = this.profileData.level;
        this.profileData.xp += amount;
        
        // Level up calculation (100 XP per level, increasing by 50 each level)
        const xpNeeded = this.profileData.level * 100 + (this.profileData.level - 1) * 50;
        
        if (this.profileData.xp >= xpNeeded) {
            this.profileData.level++;
            this.profileData.xp -= xpNeeded;
            this.onLevelUp(oldLevel, this.profileData.level);
        }
        
        this.saveProfile();
        this.updateDisplay();
    }

    onLevelUp(oldLevel, newLevel) {
        // Show level up notification
        this.showLevelUpNotification(newLevel);
        
        // Unlock new titles and avatars
        this.checkForUnlocks(newLevel);
        
        // Play level up sound
        if (window.tapRaceGame && window.tapRaceGame.soundManager) {
            window.tapRaceGame.soundManager.play('achievement');
        }
    }

    showLevelUpNotification(level) {
        const notification = document.createElement('div');
        notification.className = 'level-up-notification show';
        notification.innerHTML = `
            <div class="level-up-content">
                <div class="level-up-icon">🎉</div>
                <div>
                    <div class="level-up-title">LEVEL UP!</div>
                    <div class="level-up-level">Level ${level}</div>
                    <div class="level-up-desc">You're getting better!</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }

    checkForUnlocks(level) {
        const titles = {
            5: 'Quick Fingers',
            10: 'Reflex Master',
            15: 'Lightning Lord',
            20: 'Tap Champion',
            25: 'Speed Demon',
            30: 'Reaction God'
        };

        const avatars = {
            5: '⚡',
            10: '🏆',
            15: '👑',
            20: '🔥',
            25: '💎',
            30: '🌟'
        };

        if (titles[level]) {
            this.profileData.title = titles[level];
        }

        if (avatars[level]) {
            this.profileData.avatar = avatars[level];
        }
    }

    updateStats(gameResult) {
        this.profileData.totalGamesPlayed++;
        
        if (gameResult.won) {
            this.profileData.totalWins++;
            this.addXP(50); // Win bonus
        } else {
            this.addXP(10); // Participation XP
        }

        // Update best streak
        if (gameResult.currentStreak > this.profileData.bestStreak) {
            this.profileData.bestStreak = gameResult.currentStreak;
        }

        // Add playtime (approximate)
        this.profileData.totalPlayTime += gameResult.gameDuration || 60; // seconds

        this.saveProfile();
    }

    showProfile() {
        this.updateDisplay();
        if (this.profileModal) {
            this.profileModal.classList.add('show');
        }
    }

    hideProfile() {
        if (this.profileModal) {
            this.profileModal.classList.remove('show');
        }
    }

    updateDisplay() {
        // Handle avatar display properly for both custom images and emojis
        if (this.playerAvatar) {
            if (this.profileData.isCustomAvatar && this.profileData.avatar.startsWith('data:')) {
                // Custom uploaded image
                this.playerAvatar.innerHTML = `<img src="${this.profileData.avatar}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                // Emoji avatar
                this.playerAvatar.textContent = this.profileData.avatar;
                this.playerAvatar.innerHTML = this.profileData.avatar; // Clear any previous image
            }
        }
        
        // Update profile header with new layout
        const profileDisplayName = document.getElementById('profile-display-name');
        const profileUsername = document.getElementById('profile-username-display');
        const profileBio = document.getElementById('profile-bio-display');
        
        if (profileDisplayName) {
            profileDisplayName.textContent = this.profileData.displayName || this.profileData.username || 'Anonymous';
        }
        if (profileUsername) {
            profileUsername.textContent = `@${this.profileData.username || 'anonymous'}`;
        }
        if (profileBio) {
            profileBio.textContent = this.profileData.bio || 'No bio set';
        }
        
        if (this.playerTitle) this.playerTitle.textContent = this.profileData.title;
        if (this.playerLevel) this.playerLevel.textContent = `Level ${this.profileData.level}`;
        
        // XP Bar
        const xpNeeded = this.profileData.level * 100 + (this.profileData.level - 1) * 50;
        const xpProgress = (this.profileData.xp / xpNeeded) * 100;
        
        if (this.playerXP) this.playerXP.textContent = `${this.profileData.xp}/${xpNeeded} XP`;
        if (this.xpBar) this.xpBar.style.width = `${xpProgress}%`;

        // Stats
        if (this.statsContainer) {
            const winRate = this.profileData.totalGamesPlayed > 0 
                ? ((this.profileData.totalWins / this.profileData.totalGamesPlayed) * 100).toFixed(1)
                : 0;
            
            const playTimeHours = Math.floor(this.profileData.totalPlayTime / 3600);
            const playTimeMinutes = Math.floor((this.profileData.totalPlayTime % 3600) / 60);

            this.statsContainer.innerHTML = `
                <div class="stat-item">
                    <div class="stat-value">${this.profileData.totalGamesPlayed}</div>
                    <div class="stat-label">Games Played</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.profileData.totalWins}</div>
                    <div class="stat-label">Games Won</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${winRate}%</div>
                    <div class="stat-label">Win Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.profileData.bestStreak}</div>
                    <div class="stat-label">Best Streak</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${playTimeHours}h ${playTimeMinutes}m</div>
                    <div class="stat-label">Play Time</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${this.profileData.favoriteMode}</div>
                    <div class="stat-label">Favorite Mode</div>
                </div>
            `;
        }

        // Update badges container
        if (this.badgesContainer) {
            // Add some sample badges based on achievements
            const badges = [];
            if (this.profileData.level >= 5) badges.push({ name: 'Fast Learner', icon: '🚀' });
            if (this.profileData.totalWins >= 10) badges.push({ name: 'Winner', icon: '🏆' });
            if (this.profileData.bestStreak >= 5) badges.push({ name: 'Streak Master', icon: '🔥' });
            if (this.profileData.totalGamesPlayed >= 50) badges.push({ name: 'Dedicated', icon: '💎' });

            this.badgesContainer.innerHTML = badges.length > 0 
                ? badges.map(badge => `
                    <div class="badge-item">
                        <div class="badge-icon">${badge.icon}</div>
                        <div class="badge-name">${badge.name}</div>
                    </div>
                `).join('')
                : '<div class="no-badges">No badges earned yet. Keep playing to unlock them!</div>';
        }
    }

    getDisplayName() {
        return this.profileData.displayName || this.profileData.username || 'Anonymous';
    }

    getUsername() {
        return this.profileData.username || 'anonymous';
    }

    getLevel() {
        return this.profileData.level;
    }

    getAvatar() {
        return this.profileData.avatar;
    }

    getAvatarDisplay() {
        if (this.profileData.isCustomAvatar && this.profileData.avatar.startsWith('data:')) {
            return `<img src="${this.profileData.avatar}" alt="Avatar" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">`;
        } else {
            return this.profileData.avatar;
        }
    }

    // Additional methods for profile creation and management
    selectPresetAvatar(avatar) {
        // Remove selection from all avatars
        const avatarOptions = this.presetAvatars?.querySelectorAll('.avatar-option');
        avatarOptions?.forEach(option => option.classList.remove('selected'));
        
        // Select the clicked avatar
        const selectedOption = this.presetAvatars?.querySelector(`[data-avatar="${avatar}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Set as current avatar
        this.selectedAvatar = avatar;
        this.isCustomAvatar = false;
        
        // Clear custom avatar preview
        if (this.customAvatarPreview) {
            this.customAvatarPreview.innerHTML = '<span class="upload-text">+ Upload Custom</span>';
            this.customAvatarPreview.classList.remove('has-image');
        }
    }

    handleCustomAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be smaller than 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            
            // Update preview
            if (this.customAvatarPreview) {
                this.customAvatarPreview.innerHTML = `<img src="${imageData}" alt="Custom Avatar">`;
                this.customAvatarPreview.classList.add('has-image');
            }
            
            // Set as current avatar
            this.selectedAvatar = imageData;
            this.isCustomAvatar = true;
            
            // Clear preset avatar selections
            const avatarOptions = this.presetAvatars?.querySelectorAll('.avatar-option');
            avatarOptions?.forEach(option => option.classList.remove('selected'));
        };
        
        reader.readAsDataURL(file);
    }

    showProfileCreation() {
        // Reset form
        if (this.profileForm) {
            this.profileForm.reset();
        }
        
        // Clear selections
        this.selectedAvatar = null;
        this.isCustomAvatar = false;
        
        const avatarOptions = this.presetAvatars?.querySelectorAll('.avatar-option');
        avatarOptions?.forEach(option => option.classList.remove('selected'));
        
        if (this.customAvatarPreview) {
            this.customAvatarPreview.innerHTML = '<span class="upload-text">+ Upload Custom</span>';
            this.customAvatarPreview.classList.remove('has-image');
        }
        
        // Show modal
        if (this.createProfileModal) {
            this.createProfileModal.classList.add('show');
        }
    }

    hideProfileCreation() {
        if (this.createProfileModal) {
            this.createProfileModal.classList.remove('show');
        }
    }
}

// Spectator Mode System
class SpectatorMode {
    constructor(game) {
        this.game = game;
        this.isSpectating = false;
        this.spectatedRoom = null;
        this.initializeElements();
    }

    initializeElements() {
        this.spectateButton = document.getElementById('spectate-btn');
        this.spectateRoomInput = document.getElementById('spectate-room-id');
        this.spectateScreen = document.getElementById('spectate-screen');
        this.spectateGameArea = document.getElementById('spectate-game-area');
        this.spectatePlayersList = document.getElementById('spectate-players');
        this.spectateLeaveBtn = document.getElementById('leave-spectate');

        if (this.spectateButton) {
            this.spectateButton.addEventListener('click', () => this.startSpectating());
        }
        if (this.spectateLeaveBtn) {
            this.spectateLeaveBtn.addEventListener('click', () => this.stopSpectating());
        }
    }

    startSpectating() {
        const roomId = this.spectateRoomInput?.value.trim();
        if (!roomId) {
            alert('Please enter a room ID to spectate');
            return;
        }

        this.spectatedRoom = roomId;
        this.isSpectating = true;
        
        this.game.socket.emit('spectate-room', { roomId });
        this.showSpectateScreen();
    }

    stopSpectating() {
        if (this.spectatedRoom) {
            this.game.socket.emit('leave-spectate', { roomId: this.spectatedRoom });
        }
        
        this.isSpectating = false;
        this.spectatedRoom = null;
        this.hideSpectateScreen();
    }

    showSpectateScreen() {
        if (this.spectateScreen) {
            this.spectateScreen.classList.add('active');
        }
    }

    hideSpectateScreen() {
        if (this.spectateScreen) {
            this.spectateScreen.classList.remove('active');
        }
    }

    updateSpectateView(data) {
        if (!this.isSpectating) return;

        // Update players list
        if (this.spectatePlayersList && data.players) {
            this.spectatePlayersList.innerHTML = data.players.map(player => `
                <div class="spectate-player ${player.isReady ? 'ready' : ''}">
                    <span class="player-name">${player.name}</span>
                    <span class="player-score">${player.score || 0}</span>
                </div>
            `).join('');
        }

        // Update game state
        if (this.spectateGameArea && data.gameState) {
            this.updateSpectateGameState(data.gameState);
        }
    }

    updateSpectateGameState(gameState) {
        switch (gameState.state) {
            case 'waiting':
                this.spectateGameArea.innerHTML = '<div class="spectate-status">Waiting for players...</div>';
                break;
            case 'countdown':
                this.spectateGameArea.innerHTML = `<div class="spectate-countdown">${gameState.countdown}</div>`;
                break;
            case 'playing':
                this.spectateGameArea.innerHTML = '<div class="spectate-tap-zone active">TAP NOW!</div>';
                break;
            case 'results':
                this.spectateGameArea.innerHTML = '<div class="spectate-status">Round Complete</div>';
                break;
        }
    }
}

// Tournament System
class TournamentSystem {
    constructor() {
        this.tournaments = new Map();
        this.initializeElements();
    }

    initializeElements() {
        this.createTournamentBtn = document.getElementById('create-tournament');
        this.joinTournamentBtn = document.getElementById('join-tournament');
        this.tournamentScreen = document.getElementById('tournament-screen');
        this.tournamentBracket = document.getElementById('tournament-bracket');
        
        if (this.createTournamentBtn) {
            this.createTournamentBtn.addEventListener('click', () => this.showCreateTournament());
        }
        if (this.joinTournamentBtn) {
            this.joinTournamentBtn.addEventListener('click', () => this.showJoinTournament());
        }
    }

    createTournament(settings) {
        const tournamentId = this.generateTournamentId();
        const tournament = {
            id: tournamentId,
            name: settings.name,
            maxPlayers: settings.maxPlayers,
            gameMode: settings.gameMode,
            players: [],
            bracket: null,
            status: 'waiting',
            createdAt: new Date(),
            createdBy: settings.createdBy
        };

        this.tournaments.set(tournamentId, tournament);
        return tournament;
    }

    generateBracket(players) {
        // Simple single-elimination bracket
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const bracket = [];
        
        // Create first round matchups
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                bracket.push({
                    round: 1,
                    player1: shuffled[i],
                    player2: shuffled[i + 1],
                    winner: null,
                    status: 'pending'
                });
            } else {
                // Bye for odd number of players
                bracket.push({
                    round: 1,
                    player1: shuffled[i],
                    player2: null,
                    winner: shuffled[i],
                    status: 'bye'
                });
            }
        }

        return bracket;
    }

    showCreateTournament() {
        // Implementation for tournament creation UI
        console.log('Show create tournament UI');
    }

    showJoinTournament() {
        // Implementation for joining tournaments
        console.log('Show join tournament UI');
    }

    generateTournamentId() {
        return 'TOURN_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
}

// Export for global access
window.PlayerProfile = PlayerProfile;
window.SpectatorMode = SpectatorMode;
window.TournamentSystem = TournamentSystem;
