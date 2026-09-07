
export class UIController {
  constructor(gameState, leaderboard, audioManager) {
    this.gameState = gameState;
    this.leaderboard = leaderboard;
    this.audioManager = audioManager;

    this.menuScreen = document.getElementById('menu-screen');
    this.hudScreen = document.getElementById('hud-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.highscoresModal = document.getElementById('highscores-modal');

    this.nicknameInput = document.getElementById('nickname-input');
    this.playBtn = document.getElementById('play-btn');
    this.highscoresBtn = document.getElementById('highscores-btn');
    this.closeHighscoresBtn = document.getElementById('close-highscores-btn');
    this.backFromHighscoresBtn = document.getElementById('back-from-highscores-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.menuBtn = document.getElementById('menu-btn');

    this.sfxSlider = document.getElementById('sfx-slider');
    this.sfxVal = document.getElementById('sfx-val');
    this.musicSlider = document.getElementById('music-slider');
    this.musicVal = document.getElementById('music-val');

    this.timerDisplay = document.getElementById('timer-display');
    this.timerBar = document.getElementById('timer-bar');
    this.timerBox = document.querySelector('.timer-box');
    this.scoreDisplay = document.getElementById('score-display');
    this.comboContainer = document.getElementById('combo-container');
    this.comboDisplay = document.getElementById('combo-display');
    this.comboBarFill = document.getElementById('combo-bar-fill');
    this.playerTagName = document.getElementById('player-tag-name');

    this.finalScore = document.getElementById('final-score');
    this.finalHits = document.getElementById('final-hits');
    this.finalCombo = document.getElementById('final-combo');
    this.bestScoreDisplay = document.getElementById('best-score-display');
    this.recordBadge = document.getElementById('record-badge');
    this.leaderboardBody = document.getElementById('leaderboard-body');

    this.onStartGameRequested = null;
    this.init();
  }

  init() {
    const savedName = localStorage.getItem('colp_last_nickname') || '';
    if (this.nicknameInput) {
      this.nicknameInput.value = savedName;
    }

    if (this.sfxSlider && this.audioManager) {
      const sfxPct = Math.round(this.audioManager.sfxVolume * 100);
      this.sfxSlider.value = sfxPct;
      if (this.sfxVal) this.sfxVal.textContent = sfxPct + '%';

      this.sfxSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.sfxVal) this.sfxVal.textContent = val + '%';
        this.audioManager.setSfxVolume(val / 100);
      });
    }

    if (this.musicSlider && this.audioManager) {
      const musicPct = Math.round(this.audioManager.musicVolume * 100);
      this.musicSlider.value = musicPct;
      if (this.musicVal) this.musicVal.textContent = musicPct + '%';

      this.musicSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.musicVal) this.musicVal.textContent = val + '%';
        this.audioManager.setMusicVolume(val / 100);
      });
    }

    this.playBtn?.addEventListener('click', () => {
      const nick = this.nicknameInput?.value.trim() || 'Jogador';
      this.gameState.setNickname(nick);
      if (this.playerTagName) this.playerTagName.textContent = nick;
      if (this.onStartGameRequested) this.onStartGameRequested();
    });

    this.highscoresBtn?.addEventListener('click', () => {
      this.openHighscores();
    });

    this.closeHighscoresBtn?.addEventListener('click', () => {
      this.closeHighscores();
    });

    this.backFromHighscoresBtn?.addEventListener('click', () => {
      this.closeHighscores();
    });

    this.restartBtn?.addEventListener('click', () => {
      if (this.onStartGameRequested) this.onStartGameRequested();
    });

    this.menuBtn?.addEventListener('click', () => {
      this.showScreen('MENU');
    });

    this.gameState.onStateChange = (state) => this.showScreen(state);
    this.gameState.onTimeUpdate = (time, bonus) => this.updateTimer(time, bonus);
    this.gameState.onScoreUpdate = (score) => this.updateScore(score);
    this.gameState.onComboUpdate = (multiplier, progress, wasHit) => this.updateCombo(multiplier, progress, wasHit);
    this.gameState.onGameOver = (stats) => this.showGameOver(stats);
  }

  showScreen(state) {
    this.menuScreen?.classList.remove('active');
    this.hudScreen?.classList.remove('active');
    this.gameoverScreen?.classList.remove('active');

    if (state === 'MENU') {
      this.menuScreen?.classList.add('active');
    } else if (state === 'PLAYING') {
      this.hudScreen?.classList.add('active');
      this.comboContainer?.classList.remove('visible');
    } else if (state === 'GAMEOVER') {
      this.gameoverScreen?.classList.add('active');
    }
  }

  updateTimer(timeRemaining, bonus = 0) {
    if (this.timerDisplay) {
      this.timerDisplay.textContent = timeRemaining.toFixed(1);
    }
    if (this.timerBar) {
      const pct = Math.min(100, (timeRemaining / 30.0) * 100);
      this.timerBar.style.width = pct + '%';
    }
    if (this.timerBox) {
      if (timeRemaining <= 8.0) {
        this.timerBox.classList.add('danger');
      } else {
        this.timerBox.classList.remove('danger');
      }
    }
  }

  updateScore(score) {
    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = score;
    }
  }

  updateCombo(multiplier, progress, wasHit = false) {
    if (!this.comboContainer) return;

    if (multiplier > 1 || progress > 0) {
      this.comboContainer.classList.add('visible');
      if (wasHit) {
        this.comboContainer.classList.remove('hit-pulse');
        void this.comboContainer.offsetWidth;
        this.comboContainer.classList.add('hit-pulse');
      }
    } else {
      this.comboContainer.classList.remove('visible');
    }

    if (this.comboDisplay) {
      this.comboDisplay.textContent = multiplier + 'x';
      if (multiplier >= 5) {
        this.comboDisplay.classList.add('max');
      } else {
        this.comboDisplay.classList.remove('max');
      }
    }

    if (this.comboBarFill) {
      this.comboBarFill.style.width = (progress * 100) + '%';
    }
  }

  showGameOver(stats) {
    if (this.finalScore) this.finalScore.textContent = stats.score;
    if (this.finalHits) this.finalHits.textContent = stats.hits;
    if (this.finalCombo) this.finalCombo.textContent = stats.maxCombo + 'x';
    if (this.bestScoreDisplay) this.bestScoreDisplay.textContent = stats.bestScore;
    if (this.recordBadge) {
      this.recordBadge.style.display = stats.isNewRecord ? 'inline-block' : 'none';
    }
  }

  openHighscores() {
    this.renderHighscores();
    this.highscoresModal?.classList.add('active');
  }

  closeHighscores() {
    this.highscoresModal?.classList.remove('active');
  }

  renderHighscores() {
    if (!this.leaderboardBody) return;
    const scores = this.leaderboard.getHighscores();
    this.leaderboardBody.innerHTML = '';

    scores.forEach((item, index) => {
      const tr = document.createElement('tr');
      const rankIcon = index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : String(index + 1);
      tr.innerHTML = `
        <td>${rankIcon}</td>
        <td>${item.name}</td>
        <td>${item.score} pts</td>
        <td>${item.maxCombo || '1x'}</td>
        <td>${item.date || '-'}</td>
      `;
      this.leaderboardBody.appendChild(tr);
    });
  }
}
