class PowerUpSystem {
    constructor() {
        this.powerUps = {
            speedBoost: {
                name: 'Speed Boost',
                icon: '⚡',
                duration: 5000,
                description: 'Faster reaction time bonus',
                rarity: 0.3,
                effect: (player) => ({ reactionTimeMultiplier: 0.8 })
            },
            doublePoints: {
                name: 'Double Points',
                icon: '💎',
                duration: 3000,
                description: 'Double points for next tap',
                rarity: 0.2,
                effect: (player) => ({ pointsMultiplier: 2 })
            },
            shield: {
                name: 'Shield',
                icon: '🛡️',
                duration: 8000,
                description: 'Immunity from penalties',
                rarity: 0.15,
                effect: (player) => ({ shield: true })
            },
            freeze: {
                name: 'Freeze Others',
                icon: '❄️',
                duration: 2000,
                description: 'Slow other players briefly',
                rarity: 0.1,
                effect: (player) => ({ freezeOthers: true })
            },
            precision: {
                name: 'Precision',
                icon: '🎯',
                duration: 4000,
                description: 'Perfect accuracy bonus',
                rarity: 0.25,
                effect: (player) => ({ perfectAccuracy: true })
            }
        };
        
        this.activePowerUps = new Map();
    }

    getRandomPowerUp() {
        const random = Math.random();
        let cumulativeRarity = 0;
        
        for (const [key, powerUp] of Object.entries(this.powerUps)) {
            cumulativeRarity += powerUp.rarity;
            if (random <= cumulativeRarity) {
                return { id: key, ...powerUp };
            }
        }
        
        return null;
    }

    activatePowerUp(playerId, powerUpId) {
        const powerUp = this.powerUps[powerUpId];
        if (!powerUp) return false;

        const activeEffect = {
            ...powerUp.effect(),
            endTime: Date.now() + powerUp.duration,
            powerUpId: powerUpId
        };

        if (!this.activePowerUps.has(playerId)) {
            this.activePowerUps.set(playerId, []);
        }
        
        this.activePowerUps.get(playerId).push(activeEffect);
        
        // Auto-remove after duration
        setTimeout(() => {
            this.removePowerUp(playerId, powerUpId);
        }, powerUp.duration);

        return true;
    }

    removePowerUp(playerId, powerUpId) {
        const playerPowerUps = this.activePowerUps.get(playerId);
        if (playerPowerUps) {
            const index = playerPowerUps.findIndex(p => p.powerUpId === powerUpId);
            if (index !== -1) {
                playerPowerUps.splice(index, 1);
            }
        }
    }

    getActiveEffects(playerId) {
        const playerPowerUps = this.activePowerUps.get(playerId) || [];
        const currentTime = Date.now();
        
        // Remove expired power-ups
        const activePowerUps = playerPowerUps.filter(p => p.endTime > currentTime);
        this.activePowerUps.set(playerId, activePowerUps);
        
        // Combine effects
        return activePowerUps.reduce((combined, powerUp) => {
            return { ...combined, ...powerUp };
        }, {});
    }

    clearPlayerPowerUps(playerId) {
        this.activePowerUps.delete(playerId);
    }
}

class AchievementSystem {
    constructor() {
        this.achievements = {
            firstWin: {
                name: 'First Victory',
                description: 'Win your first game',
                icon: '🏆',
                condition: (stats) => stats.gamesWon >= 1
            },
            speedDemon: {
                name: 'Speed Demon',
                description: 'React in under 150ms',
                icon: '⚡',
                condition: (stats) => stats.bestReactionTime < 150
            },
            perfectRound: {
                name: 'Perfect Round',
                description: 'Win all rounds in a game',
                icon: '💯',
                condition: (stats) => stats.perfectGames >= 1
            },
            consistent: {
                name: 'Mr. Consistent',
                description: 'Win 5 games in a row',
                icon: '🎯',
                condition: (stats) => stats.winStreak >= 5
            },
            veteran: {
                name: 'Veteran Player',
                description: 'Play 50 games',
                icon: '🎖️',
                condition: (stats) => stats.gamesPlayed >= 50
            },
            powerUpMaster: {
                name: 'Power-Up Master',
                description: 'Use 25 power-ups',
                icon: '🔋',
                condition: (stats) => stats.powerUpsUsed >= 25
            },
            socialButterfly: {
                name: 'Social Butterfly',
                description: 'Play with 10 different players',
                icon: '🦋',
                condition: (stats) => stats.uniquePlayers >= 10
            },
            lightning: {
                name: 'Lightning Reflexes',
                description: 'Average under 200ms reaction time',
                icon: '⚡',
                condition: (stats) => stats.avgReactionTime < 200
            }
        };
        
        this.playerAchievements = new Map();
    }

    checkAchievements(playerId, stats) {
        const playerAchievements = this.playerAchievements.get(playerId) || new Set();
        const newAchievements = [];

        for (const [id, achievement] of Object.entries(this.achievements)) {
            if (!playerAchievements.has(id) && achievement.condition(stats)) {
                playerAchievements.add(id);
                newAchievements.push({ id, ...achievement });
            }
        }

        this.playerAchievements.set(playerId, playerAchievements);
        return newAchievements;
    }

    getPlayerAchievements(playerId) {
        const playerAchievements = this.playerAchievements.get(playerId) || new Set();
        return Array.from(playerAchievements).map(id => ({
            id,
            ...this.achievements[id]
        }));
    }
}

class GameModes {
    static modes = {
        classic: {
            name: 'Classic',
            description: '5 rounds, standard scoring',
            rounds: 5,
            powerUps: false,
            countdown: { min: 2000, max: 6000 },
            scoring: 'standard'
        },
        blitz: {
            name: 'Blitz',
            description: '10 quick rounds, faster pace',
            rounds: 10,
            powerUps: false,
            countdown: { min: 1000, max: 3000 },
            scoring: 'standard'
        },
        powerUp: {
            name: 'Power-Up Madness',
            description: 'Classic with power-ups enabled',
            rounds: 5,
            powerUps: true,
            countdown: { min: 2000, max: 6000 },
            scoring: 'standard'
        },
        elimination: {
            name: 'Elimination',
            description: 'Slowest player eliminated each round',
            rounds: 999, // Until one player remains
            powerUps: false,
            countdown: { min: 2000, max: 6000 },
            scoring: 'elimination'
        },
        marathon: {
            name: 'Marathon',
            description: '20 rounds of endurance',
            rounds: 20,
            powerUps: true,
            countdown: { min: 1500, max: 5000 },
            scoring: 'standard'
        },
        precision: {
            name: 'Precision Mode',
            description: 'Accuracy matters more than speed',
            rounds: 7,
            powerUps: false,
            countdown: { min: 3000, max: 8000 },
            scoring: 'precision'
        }
    };

    static getMode(modeId) {
        return this.modes[modeId] || this.modes.classic;
    }

    static getAllModes() {
        return Object.entries(this.modes).map(([id, mode]) => ({
            id,
            ...mode
        }));
    }
}
