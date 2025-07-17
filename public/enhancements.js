// Enhanced Power-Up System with New Abilities
class EnhancedPowerUps {
    static newPowerUps = {
        timeWarp: {
            name: 'Time Warp',
            icon: '⏰',
            duration: 3000,
            description: 'Slows down time perception',
            rarity: 0.05,
            effect: (player) => ({ 
                timeMultiplier: 0.5,
                visualEffect: 'time-warp'
            })
        },
        
        magneticField: {
            name: 'Magnetic Field',
            icon: '🧲',
            duration: 6000,
            description: 'Attracts taps to the center',
            rarity: 0.08,
            effect: (player) => ({ 
                magneticRadius: 100,
                visualEffect: 'magnetic-field'
            })
        },
        
        perfectStrike: {
            name: 'Perfect Strike',
            icon: '🎯',
            duration: 2000,
            description: 'Next tap guaranteed perfect score',
            rarity: 0.06,
            effect: (player) => ({ 
                guaranteedPerfect: true,
                visualEffect: 'perfect-strike'
            })
        },
        
        ghost: {
            name: 'Ghost Mode',
            icon: '👻',
            duration: 4000,
            description: 'Immune to other players\' negative effects',
            rarity: 0.07,
            effect: (player) => ({ 
                immuneToEffects: true,
                visualEffect: 'ghost-mode'
            })
        },
        
        combo: {
            name: 'Combo Master',
            icon: '🔥',
            duration: 8000,
            description: 'Each consecutive fast tap increases score',
            rarity: 0.09,
            effect: (player) => ({ 
                comboMultiplier: 1.5,
                visualEffect: 'combo-master'
            })
        }
    };

    static getRandomEnhancedPowerUp() {
        const allPowerUps = { ...this.newPowerUps };
        const random = Math.random();
        let cumulativeRarity = 0;
        
        for (const [key, powerUp] of Object.entries(allPowerUps)) {
            cumulativeRarity += powerUp.rarity;
            if (random <= cumulativeRarity) {
                return { id: key, ...powerUp };
            }
        }
        
        return null;
    }
}

// Game Analytics System
class GameAnalytics {
    constructor() {
        this.sessionData = {
            startTime: Date.now(),
            gamesPlayed: 0,
            totalPlayTime: 0,
            averageReactionTime: 0,
            bestReactionTime: Infinity,
            powerUpsUsed: 0,
            achievementsUnlocked: 0,
            roomsCreated: 0,
            roomsJoined: 0
        };
        
        this.loadSessionData();
    }

    loadSessionData() {
        const saved = localStorage.getItem('tapChamps_analytics');
        if (saved) {
            this.sessionData = { ...this.sessionData, ...JSON.parse(saved) };
        }
    }

    saveSessionData() {
        localStorage.setItem('tapChamps_analytics', JSON.stringify(this.sessionData));
    }

    trackGameStart() {
        this.sessionData.gamesPlayed++;
        this.saveSessionData();
    }

    trackReactionTime(time) {
        if (time < this.sessionData.bestReactionTime) {
            this.sessionData.bestReactionTime = time;
        }
        
        // Calculate running average
        const currentAvg = this.sessionData.averageReactionTime;
        const gameCount = this.sessionData.gamesPlayed;
        this.sessionData.averageReactionTime = ((currentAvg * (gameCount - 1)) + time) / gameCount;
        
        this.saveSessionData();
    }

    trackPowerUpUsed() {
        this.sessionData.powerUpsUsed++;
        this.saveSessionData();
    }

    trackAchievementUnlocked() {
        this.sessionData.achievementsUnlocked++;
        this.saveSessionData();
    }

    getInsights() {
        const playTime = Date.now() - this.sessionData.startTime;
        const avgGameDuration = this.sessionData.gamesPlayed > 0 
            ? playTime / this.sessionData.gamesPlayed / 1000 / 60 // minutes
            : 0;

        return {
            totalPlayTime: Math.round(playTime / 1000 / 60), // minutes
            gamesPerHour: this.sessionData.gamesPlayed / (playTime / 1000 / 60 / 60),
            averageGameDuration: Math.round(avgGameDuration * 10) / 10,
            improvementRate: this.calculateImprovementRate(),
            efficiency: this.calculateEfficiency()
        };
    }

    calculateImprovementRate() {
        // Simple improvement calculation based on best vs average
        if (this.sessionData.averageReactionTime === 0) return 0;
        
        const improvement = (this.sessionData.averageReactionTime - this.sessionData.bestReactionTime) 
            / this.sessionData.averageReactionTime;
        return Math.round(improvement * 100);
    }

    calculateEfficiency() {
        // Efficiency based on games played vs time spent
        const playTimeHours = (Date.now() - this.sessionData.startTime) / 1000 / 60 / 60;
        return playTimeHours > 0 ? Math.round(this.sessionData.gamesPlayed / playTimeHours) : 0;
    }
}

// Smart Matchmaking System
class MatchmakingSystem {
    constructor() {
        this.skillRatings = new Map();
        this.loadRatings();
    }

    loadRatings() {
        const saved = localStorage.getItem('tapChamps_skillRatings');
        if (saved) {
            const data = JSON.parse(saved);
            this.skillRatings = new Map(data);
        }
    }

    saveRatings() {
        const data = Array.from(this.skillRatings.entries());
        localStorage.setItem('tapChamps_skillRatings', JSON.stringify(data));
    }

    calculateSkillRating(playerName) {
        const stats = JSON.parse(localStorage.getItem('tapChamps_playerStats')) || {};
        
        if (!stats.gamesPlayed) return 1000; // Default rating
        
        const winRate = stats.gamesWon / stats.gamesPlayed;
        const reactionFactor = Math.max(0, (500 - stats.bestReactionTime) / 500);
        const consistencyFactor = stats.winStreak > 0 ? Math.min(1.5, stats.winStreak / 5) : 0.5;
        
        const rating = 1000 + (winRate * 500) + (reactionFactor * 300) + (consistencyFactor * 200);
        
        this.skillRatings.set(playerName, Math.round(rating));
        this.saveRatings();
        
        return Math.round(rating);
    }

    getSkillTier(rating) {
        if (rating >= 1800) return { name: 'Grandmaster', icon: '👑', color: '#FFD700' };
        if (rating >= 1600) return { name: 'Master', icon: '💎', color: '#00CED1' };
        if (rating >= 1400) return { name: 'Expert', icon: '🏆', color: '#FF6347' };
        if (rating >= 1200) return { name: 'Advanced', icon: '⚡', color: '#32CD32' };
        if (rating >= 1000) return { name: 'Intermediate', icon: '🎯', color: '#FFA500' };
        return { name: 'Beginner', icon: '🌱', color: '#87CEEB' };
    }

    findBalancedOpponents(playerRating, availablePlayers) {
        // Find players within 200 rating points for balanced matches
        return availablePlayers.filter(player => {
            const playerSkill = this.skillRatings.get(player.name) || 1000;
            return Math.abs(playerSkill - playerRating) <= 200;
        });
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.EnhancedPowerUps = EnhancedPowerUps;
    window.GameAnalytics = GameAnalytics;
    window.MatchmakingSystem = MatchmakingSystem;
}
