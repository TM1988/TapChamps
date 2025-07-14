# 🚀 Tap Race - Ultimate Reflex Challenge

A real-time multiplayer reflex game where players compete to tap as fast as possible when visual cues appear. Built with Node.js, Socket.IO, and vanilla JavaScript.

## 🎮 Game Features

- **Real-time Multiplayer**: Compete with friends in real-time
- **Minimalist Design**: Clean, modern UI with smooth animations
- **Reflex Challenge**: Test your reaction time with visual cues
- **Scoring System**: Points based on reaction time (faster = more points)
- **Global Leaderboard**: Track your performance against other players
- **Mobile Responsive**: Works perfectly on desktop and mobile devices

## 🏆 How to Play

1. **Enter Your Name**: Choose a unique player name
2. **Join/Create Room**: Enter a room ID to join friends or leave blank to create new room
3. **Wait for Players**: Share the room ID with friends to play together
4. **Get Ready**: Click "Ready to Play!" when you're prepared
5. **React Fast**: When the circle turns GREEN, tap as fast as possible!
6. **Compete**: Play 5 rounds and see who has the best reflexes

## 🎯 Scoring System

- **< 200ms**: 100 points (Lightning Fast! ⚡)
- **< 300ms**: 80 points (Very Fast! 🔥)
- **< 500ms**: 60 points (Fast! 💨)
- **< 700ms**: 40 points (Good! 👍)
- **700ms+**: 20 points (Keep Practicing! 💪)

## 🚀 Installation & Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Open in Browser**
   - Navigate to `http://localhost:3000`
   - Share the URL with friends to play together!

### Development Mode

For development with auto-restart:
```bash
npm run dev
```

## 🛠️ Technical Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Real-time**: WebSocket connections via Socket.IO
- **Styling**: Modern CSS with gradients, animations, and responsive design

## 🌟 Game Mechanics

### Room System
- Each game room can host multiple players
- Room IDs are automatically generated or can be custom
- Players can join existing rooms or create new ones

### Real-time Features
- Live player status updates
- Real-time tap notifications
- Instant score updates
- Live activity feed

### Game Flow
1. **Lobby Phase**: Players join and ready up
2. **Countdown**: Random delay (2-6 seconds) before each round
3. **Active Phase**: Circle turns green, players tap
4. **Results**: Show reaction times and points
5. **Repeat**: 5 rounds total
6. **Final Results**: Display winner and statistics

## 📱 Mobile Support

The game is fully optimized for mobile devices with:
- Touch-friendly tap zones
- Responsive design
- Optimized animations
- Prevented context menus and scroll

## 🎨 Design Features

- **Modern UI**: Clean, minimalist design with beautiful gradients
- **Smooth Animations**: CSS transitions and keyframe animations
- **Visual Feedback**: Color-coded states and real-time updates
- **Accessibility**: Clear visual cues and readable fonts

## 🔧 Customization

### Adjusting Game Settings

In `server.js`, you can modify:
- `maxRounds`: Number of rounds per game (default: 5)
- Countdown delay range (default: 2-6 seconds)
- Scoring thresholds and point values
- Auto-round timeout (default: 3 seconds)

### Styling Customization

In `public/style.css`, you can customize:
- Color schemes and gradients
- Animation speeds and effects
- Layout and spacing
- Mobile breakpoints

## 📊 Statistics Tracking

The game tracks:
- **Global Leaderboard**: Average scores across all games
- **Reaction Times**: Best and average reaction times
- **Games Played**: Total number of games completed
- **Session Stats**: Per-game performance metrics

## 🌐 Deployment

### Local Network
The game works on your local network. Other devices can connect using your computer's IP address:
```
http://YOUR_IP_ADDRESS:3000
```

### Cloud Deployment
Can be deployed to platforms like:
- Heroku
- DigitalOcean
- AWS
- Google Cloud Platform

## 🎮 Game Tips

1. **Stay Focused**: Watch the circle carefully for the color change
2. **Stay Relaxed**: Tension can slow your reaction time
3. **Practice**: Your reflexes will improve with practice
4. **Mobile vs Desktop**: Try both to see which works better for you
5. **Lighting**: Good lighting helps you see the color change faster

## 🤝 Multiplayer Experience

- **Fair Play**: All players see the same timing
- **Real-time Updates**: See other players' results instantly
- **Social Features**: Live activity feed shows what's happening
- **Competitive**: Leaderboards encourage friendly competition

## 🔄 Future Enhancements

Potential features to add:
- Tournament mode with brackets
- Different game modes (survival, time attack)
- Player profiles and achievements
- Sound effects and music
- Spectator mode
- Replay system

## 📞 Support

If you encounter any issues:
1. Check that Node.js is properly installed
2. Ensure port 3000 is available
3. Try refreshing the browser
4. Check the console for error messages

## 🎉 Have Fun!

Enjoy testing your reflexes and competing with friends in this fast-paced reaction game! May the fastest tapper win! 🏆⚡

---

*Built with ❤️ for the ultimate reflex challenge experience*
# TapChamps
