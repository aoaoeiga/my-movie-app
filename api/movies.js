export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { answers } = req.body;
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'APIキーが設定されていません' });
  }

  try {
    // ジャンルマッピング
    const genreMap = {
      action: 28,
      comedy: 35,
      horror: 27,
      romance: 10749,
      scifi: 878,
      drama: 18,
      thriller: 53,
      fantasy: 14,
      mystery: 9648,
      adventure: 12,
      crime: 80,
      family: 10751,
      animation: 16,
      war: 10752,
      musical: 10402,
      documentary: 99
    };

    // 年代マッピング
    const decadeMap = {
      '1990s': { min: '1900-01-01', max: '1999-12-31' },
      '2000s': { min: '2000-01-01', max: '2009-12-31' },
      '2010s': { min: '2010-01-01', max: '2019-12-31' },
      '2020s': { min: '2020-01-01', max: '2029-12-31' }
    };

    // 視聴時間マッピング
    const runtimeMap = {
      short: { min: 0, max: 90 },
      medium: { min: 90, max: 120 },
      long: { min: 120, max: 300 }
    };

    // 優先順位リスト（上から順に拘束力が強い）
    // 1. type (アニメ/実写) - 最優先
    // 2. language (言語)
    // 3. genre (ジャンル)
    // 4. award (受賞作品かどうか)
    // 5. decade (年代)
    // 6. runtime (視聴時間)
    // 7. mood (気分) - 優先度低
    // 8. setting (舞台) - 優先度低
    // 9. with (誰と見る) - 優先度最低

    const priorityLevels = [
      // レベル1: 全条件適用
      ['type', 'language', 'genre', 'award', 'decade', 'runtime', 'mood', 'setting', 'with'],
      // レベル2: 「誰と見る」を除外
      ['type', 'language', 'genre', 'award', 'decade', 'runtime', 'mood', 'setting'],
      // レベル3: 「舞台」も除外
      ['type', 'language', 'genre', 'award', 'decade', 'runtime', 'mood'],
      // レベル4: 「気分」も除外
      ['type', 'language', 'genre', 'award', 'decade', 'runtime'],
      // レベル5: 「視聴時間」も除外
      ['type', 'language', 'genre', 'award', 'decade'],
      // レベル6: 「年代」も除外
      ['type', 'language', 'genre', 'award'],
      // レベル7: 「受賞作品」も除外
      ['type', 'language', 'genre'],
      // レベル8: 「ジャンル」も除外
      ['type', 'language'],
      // レベル9: 「言語」も除外（アニメ/実写のみ）
      ['type'],
      // レベル10: 全条件無視（人気作品）
      []
    ];

    // 各レベルで検索を試行
    for (let level = 0; level < priorityLevels.length; level++) {
      const activeConditions = priorityLevels[level];
      
      console.log(`\n=== レベル ${level + 1} 検索開始 ===`);
      console.log('適用条件:', activeConditions);

      // 基本パラメータ
      let params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: 'ja-JP',
        sort_by: 'popularity.desc',
        include_adult: 'false',
        'vote_count.gte': '10'
      });

      // 条件1: アニメ or 実写（最優先）
      if (activeConditions.includes('type')) {
        if (answers.type === 'anime') {
          params.append('with_genres', '16');
        } else if (answers.type === 'live') {
          params.append('without_genres', '16');
        }
      }

      // 条件2: 言語
      if (activeConditions.includes('language') && answers.language && answers.language !== 'any') {
        if (['ja', 'en', 'ko', 'zh', 'fr'].includes(answers.language)) {
          params.append('with_original_language', answers.language);
        }
      }

      // 条件3: ジャンル
      if (activeConditions.includes('genre') && answers.genre && answers.genre !== 'any' && genreMap[answers.genre]) {
        const currentGenres = params.get('with_genres');
        if (currentGenres) {
          params.set('with_genres', `${currentGenres},${genreMap[answers.genre]}`);
        } else {
          params.append('with_genres', genreMap[answers.genre]);
        }
      }

      // 条件4: 受賞作品 / 人気作品 / 隠れた名作
      if (activeConditions.includes('award')) {
        if (answers.award === 'award') {
          params.set('sort_by', 'vote_average.desc');
          params.set('vote_count.gte', '500');
          params.append('vote_average.gte', '7.0');
        } else if (answers.award === 'popular') {
          params.set('sort_by', 'popularity.desc');
          params.set('vote_count.gte', '100');
        } else if (answers.award === 'hidden') {
          params.set('sort_by', 'vote_average.desc');
          params.set('vote_count.gte', '20');
          params.set('vote_count.lte', '500');
          params.append('vote_average.gte', '6.5');
        }
      }

      // 条件5: 年代
      if (activeConditions.includes('decade') && answers.decade && answers.decade !== 'any' && decadeMap[answers.decade]) {
        const decade = decadeMap[answers.decade];
        params.append('primary_release_date.gte', decade.min);
        params.append('primary_release_date.lte', decade.max);
      }

      // 条件6: 視聴時間
      if (activeConditions.includes('runtime') && answers.runtime && answers.runtime !== 'any' && runtimeMap[answers.runtime]) {
        const runtime = runtimeMap[answers.runtime];
        params.append('with_runtime.gte', runtime.min);
        params.append('with_runtime.lte', runtime.max);
      }

      // 条件7-9: mood, setting, with は検索パラメータに直接反映しない
      // （TMDBのAPIではサポートされていないため、結果を取得後にフィルタリングする場合に使用）

      const url = `${TMDB_BASE_URL}/discover/movie?${params.toString()}`;
      console.log('API URL:', url);

      const response = await fetch(url);
      const data = await response.json();
      
      const movieList = data.results || [];
      console.log(`結果: ${movieList.length}件`);

      // 結果が見つかった場合
      if (movieList.length > 0) {
        console.log(`✅ レベル ${level + 1} で映画が見つかりました！`);
        
        // ランダムに選択（上位20件から）
        const topMovies = movieList.slice(0, Math.min(20, movieList.length));
        const randomMovie = topMovies[Math.floor(Math.random() * topMovies.length)];
        
        // 詳細情報を取得
        const detailResponse = await fetch(
          `${TMDB_BASE_URL}/movie/${randomMovie.id}?api_key=${TMDB_API_KEY}&language=ja-JP`
        );
        const movieDetail = await detailResponse.json();

        return res.status(200).json({
          title: movieDetail.title || movieDetail.original_title,
          originalTitle: movieDetail.original_title,
          year: movieDetail.release_date ? new Date(movieDetail.release_date).getFullYear() : null,
          rating: movieDetail.vote_average ? movieDetail.vote_average.toFixed(1) : 'N/A',
          runtime: movieDetail.runtime || null,
          desc: movieDetail.overview || '説明がありません',
          poster: movieDetail.poster_path 
            ? `https://image.tmdb.org/t/p/w500${movieDetail.poster_path}` 
            : null,
          genres: movieDetail.genres?.map(g => g.name).join(', ') || '',
          matchLevel: level + 1  // デバッグ用：どのレベルでマッチしたか
        });
      }

      console.log(`❌ レベル ${level + 1} では見つかりませんでした。次のレベルへ...`);
    }

    // 全レベルで見つからなかった場合（ほぼ起こらない）
    console.log('⚠️ 全レベルで映画が見つかりませんでした');
    return res.status(200).json({ 
      error: '申し訳ございません。条件に合う映画が見つかりませんでした。' 
    });

  } catch (error) {
    console.error('❌ エラー発生:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました: ' + error.message });
  }
}
```

---

## ✅ 仕組み

### 📊 優先順位（拘束力の強さ）

1. **type** (アニメ/実写) - **最強**
2. **language** (言語)
3. **genre** (ジャンル)
4. **award** (受賞作品)
5. **decade** (年代)
6. **runtime** (視聴時間)
7. **mood** (気分) - 優先度低
8. **setting** (舞台) - 優先度低
9. **with** (誰と見る) - **最弱**

### 🔄 段階的緩和プロセス
```
レベル1: 全条件適用 → 結果なし
  ↓
レベル2: 「誰と見る」を除外 → 結果なし
  ↓
レベル3: 「舞台」も除外 → 結果なし
  ↓
レベル4: 「気分」も除外 → 結果なし
  ↓
レベル5: 「視聴時間」も除外 → 結果なし
  ↓
レベル6: 「年代」も除外 → 結果なし
  ↓
レベル7: 「受賞作品」も除外 → 結果なし
  ↓
レベル8: 「ジャンル」も除外 → 結果なし
  ↓
レベル9: 「言語」も除外 → 結果なし
  ↓
レベル10: 「アニメ/実写」のみ → 必ず見つかる！
