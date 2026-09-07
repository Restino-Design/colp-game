
export class LeaderboardClient {
  constructor() {
    this.storageKey = 'colp_highscores_v2';
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    this.globalScores = [];
    
    if (this.supabaseUrl && this.supabaseKey) {
      this.fetchGlobalScores();
    }
  }

  async fetchGlobalScores() {
    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/highscores?select=*&order=score.desc&limit=10`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        this.globalScores = data.map(item => {
          const now = new Date(item.created_at || item.date);
          const dateStr = String(now.getDate()).padStart(2, '0') + '/' + 
                          String(now.getMonth() + 1).padStart(2, '0') + '/' + 
                          now.getFullYear();
          return {
            name: item.nickname || item.name,
            score: item.score,
            maxCombo: (item.max_combo || item.maxCombo || 1) + 'x',
            date: dateStr
          };
        });
      }
    } catch (e) {
      console.warn('[Supabase] Failed to fetch highscores:', e);
    }
  }

  getHighscores() {
    if (this.supabaseUrl && this.supabaseKey && this.globalScores.length > 0) {
      return this.globalScores;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    return [
      { name: 'Mestre Toupeira', score: 350, maxCombo: '5x', date: '29/08/2026' },
      { name: 'HammerKing', score: 280, maxCombo: '5x', date: '29/08/2026' },
      { name: 'Whacker99', score: 210, maxCombo: '4x', date: '28/08/2026' },
      { name: 'ColpChamp', score: 175, maxCombo: '3x', date: '27/08/2026' },
      { name: 'ArcadePlayer', score: 140, maxCombo: '3x', date: '26/08/2026' }
    ];
  }

  async saveScore(name, score, maxCombo) {
    const list = this.getHighscores();
    const now = new Date();
    const dateStr = String(now.getDate()).padStart(2, '0') + '/' + 
                    String(now.getMonth() + 1).padStart(2, '0') + '/' + 
                    now.getFullYear();

    const newScoreItem = {
      name: name || 'Jogador',
      score: score,
      maxCombo: maxCombo + 'x',
      date: dateStr
    };

    // Save locally
    const localList = [...list];
    localList.push(newScoreItem);
    localList.sort((a, b) => b.score - a.score);
    const top10 = localList.slice(0, 10);

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(top10));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }

    // Save globally to Supabase if configured
    if (this.supabaseUrl && this.supabaseKey) {
      try {
        await fetch(`${this.supabaseUrl}/rest/v1/highscores`, {
          method: 'POST',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            nickname: name || 'Jogador',
            score: score,
            max_combo: maxCombo,
            created_at: new Date().toISOString()
          })
        });
        await this.fetchGlobalScores();
      } catch (err) {
        console.warn('Supabase post error:', err);
      }
    }

    return top10;
  }

  getBestScore(name) {
    const list = this.getHighscores();
    if (!name) return list.length > 0 ? list[0].score : 0;
    const playerScores = list.filter(item => item.name.toLowerCase() === name.toLowerCase());
    if (playerScores.length === 0) return 0;
    return Math.max(...playerScores.map(p => p.score));
  }
}
