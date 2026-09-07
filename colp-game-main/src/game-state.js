
export class GameState {
  constructor(leaderboard) {
    this.leaderboard = leaderboard;
    this.score = 0;
    this.hits = 0;
    this.basePoints = 7;
    this.comboStage = 1;
    this.currentMultiplier = 1;
    this.maxMultiplier = 5;
    this.maxComboAchieved = 1;
    this.timeRemaining = 30.0;
    this.comboDuration = 3.0;
    this.comboTimeLeft = 0;
    this.nickname = 'Jogador';
    this.state = 'MENU';

    this.onStateChange = null;
    this.onTimeUpdate = null;
    this.onScoreUpdate = null;
    this.onComboUpdate = null;
    this.onGameOver = null;
  }

  setNickname(name) {
    this.nickname = name || 'Jogador';
    localStorage.setItem('colp_last_nickname', this.nickname);
  }

  startGame() {
    this.score = 0;
    this.hits = 0;
    this.comboStage = 1;
    this.currentMultiplier = 1;
    this.maxComboAchieved = 1;
    this.timeRemaining = 30.0;
    this.comboTimeLeft = 0;
    this.state = 'PLAYING';

    if (this.onScoreUpdate) this.onScoreUpdate(this.score);
    if (this.onTimeUpdate) this.onTimeUpdate(this.timeRemaining);
    if (this.onComboUpdate) this.onComboUpdate(1, 0, false);
    if (this.onStateChange) this.onStateChange(this.state);
  }

  handleHit(hitData) {
    if (this.state !== 'PLAYING') return null;

    this.hits += 1;

    const activeMultiplier = this.currentMultiplier;
    const pointsGained = this.basePoints * activeMultiplier;
    this.score += pointsGained;

    this.comboStage = Math.min(this.maxMultiplier, activeMultiplier + 1);
    this.currentMultiplier = this.comboStage;
    this.comboTimeLeft = this.comboDuration;

    if (this.currentMultiplier > this.maxComboAchieved) {
      this.maxComboAchieved = this.currentMultiplier;
    }

    let timeBonus = 0;
    if (hitData.hasPowerup) {
      timeBonus = 8;
      this.timeRemaining = Math.min(67, this.timeRemaining + timeBonus);
    } else if (hitData.hasPowerdown) {
      timeBonus = -15;
      this.timeRemaining = Math.max(0, this.timeRemaining + timeBonus);
    }

    if (this.onScoreUpdate) this.onScoreUpdate(this.score);
    if (this.onComboUpdate) this.onComboUpdate(this.currentMultiplier, 1.0, true);
    if (this.onTimeUpdate) this.onTimeUpdate(this.timeRemaining, timeBonus);

    if (this.timeRemaining <= 0) {
      this.endGame();
    }

    return {
      pointsGained,
      multiplier: activeMultiplier,
      nextMultiplier: this.currentMultiplier,
      timeBonus
    };
  }

  endGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'GAMEOVER';

    this.leaderboard.saveScore(this.nickname, this.score, this.maxComboAchieved);
    const bestScore = this.leaderboard.getBestScore(this.nickname);
    const isNewRecord = this.score >= bestScore && this.score > 0;

    const gameStats = {
      score: this.score,
      hits: this.hits,
      maxCombo: this.maxComboAchieved,
      bestScore: bestScore,
      isNewRecord: isNewRecord
    };

    if (this.onGameOver) this.onGameOver(gameStats);
    if (this.onStateChange) this.onStateChange(this.state);
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      if (this.onTimeUpdate) this.onTimeUpdate(0);
      this.endGame();
      return;
    }

    if (this.onTimeUpdate) this.onTimeUpdate(this.timeRemaining);

    if (this.comboTimeLeft > 0) {
      this.comboTimeLeft -= dt;
      const progress = Math.max(0, this.comboTimeLeft / this.comboDuration);

      if (this.comboTimeLeft <= 0) {
        this.comboTimeLeft = 0;
        this.comboStage = 1;
        this.currentMultiplier = 1;
        if (this.onComboUpdate) this.onComboUpdate(1, 0, false);
      } else {
        const decayedMultiplier = Math.max(1, Math.ceil(progress * this.comboStage));
        this.currentMultiplier = Math.min(this.maxMultiplier, decayedMultiplier);
        if (this.onComboUpdate) this.onComboUpdate(this.currentMultiplier, progress, false);
      }
    }
  }
}
