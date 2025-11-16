export default async function handler(req, res) {
  // CORSヘッダー
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { answers } = req.body;
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY is not set');
    return res.status(500).json({ error: 'APIキーが設定されていません' });
  }

  console.log('📥 Received answers:', JSON.stringify(answers));

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
    // 1. type (アニメ/実写) - 最強
    // 2. language (言語)
    // 3. genre (ジャンル)
    // 4. award (受賞作品かどうか)
    // 5. decade (年代)
    // 6. runtime (視聴時間)
    const priorityLevels = [
      ['type', 'language', 'genre', 'award', 'decade', 'runtime'],
      ['type', 'language', 'genre', 'award', 'decade'],
      ['type', 'language', 'genre', 'award'],
      ['type', 'language', 'genre'],
      ['type', 'genre'],
      ['type'],
      []
    ];

    // 各レベルで検索を試行
    for (let level = 0; level < priorityLevels.length; level++) {
      const activeConditions = priorityLevels[level];
      
      console.log(`\n🔍 レベル ${level + 1} 検索開始`);
      console.log('適用条件:', activeConditions.join(', ') || '条件なし（人気作品）');

      // 基本パラメータ
      const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: 'ja-JP',
        sort_by: 'popularity.desc',
        include_adult: 'false',
        'vote_count.gte': '10',
        page: '1'
      });

      // 条件1: アニメ or 実写（最優先）
      if (activeConditions.includes('type') && answers.type) {
        if (answers.type === 'anime') {
          params.append('with_genres', '16');
          console.log('  ✓ アニメ指定');
        } else if (answers.type === 'live') {
          params.append('without_genres', '16');
          console.log('  ✓ 実写指定');
        }
      }

      // 条件2: 言語
      if (activeConditions.includes('language') && answers.language && answers.language !== 'any') {
        if (['ja', 'en', 'ko', 'zh', 'fr'].includes(answers.language)) {
          params.append('with_original_language', answers.language);
          console.log('  ✓ 言語:', answers.language);
        }
      }

      // 条件3: ジャンル
      if (activeConditions.includes('genre') && answers.genre && answers.genre !== 'any') {
        if (genreMap[answers.genre]) {
          const currentGenres = params.get('with_genres');
          if (currentGenres) {
            params.set('with_genres', `${currentGenres},${genreMap[answers.genre]}`);
          } else {
            params.append('with_genres', genreMap[answers.genre]);
          }
          console.log('  ✓ ジャンル:', answers.genre);
        }
      }

      // 条件4: 受賞作品 / 人気作品 / 隠れた名作
      if (activeConditions.includes('award') && answers.award) {
        if (answers.award === 'award') {
          params.set('sort_by', 'vote_average.desc');
          params.set('vote_count.gte', '500');
          params.append('vote_average.gte', '7.0');
          console.log('  ✓ 受賞作品指定');
        } else if (answers.award === 'popular') {
          params.set('sort_by', 'popularity.desc');
          params.set('vote_count.gte', '100');
          console.log('  ✓ 人気作品指定');
        } else if (answers.award === 'hidden') {
          params.set('sort_by', 'vote_average.desc');
          params.set('vote_count.gte', '20');
          params.set('vote_count.lte', '500');
          params.append('vote_average.gte', '6.5');
          console.log('  ✓ 隠れた名作指定');
        }
      }

      // 条件5: 年代
      if (activeConditions.includes('decade') && answers.decade && answers.decade !== 'any') {
        if (decadeMap[answers.decade]) {
          const decade = decadeMap[answers.decade];
          params.append('primary_release_date.gte', decade.min);
          params.append('primary_release_date.lte', decade.max);
          console.log('  ✓ 年代:', answers.decade);
        }
      }

      // 条件6: 視聴時間
      if (activeConditions.includes('runtime') && answers.runtime && answers.runtime !== 'any') {
        if (runtimeMap[answers.runtime]) {
          const runtime = runtimeMap[answers.runtime];
          params.append('with_runtime.gte', runtime.min);
          params.append('with_runtime.lte', runtime.max);
          console.log('  ✓ 視聴時間:', answers.runtime);
        }
      }

      const url = `${TMDB_BASE_URL}/discover/movie?${params.toString()}`;
      console.log('📡 API URL:', url);

      let response;
      let data;

      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`❌ TMDB API Error: ${response.status} ${response.statusText}`);
          continue; // 次のレベルへ
        }

        const text = await response.text();
        console.log('📄 Response preview:', text.substring(0, 200));
        
        data = JSON.parse(text);
      } catch (fetchError) {
        console.error('❌ Fetch/Parse Error:', fetchError.message);
        continue; // 次のレベルへ
      }
      
      const movieList = data.results || [];
      console.log(`📊 結果: ${movieList.length}件`);

      if (movieList.length > 0) {
        console.log(`✅ レベル ${level + 1} で映画が見つかりました！`);
        
        // ランダムに選択（上位20件から）
        const topMovies = movieList.slice(0, Math.min(20, movieList.length));
        const randomMovie = topMovies[Math.floor(Math.random() * topMovies.length)];
        
        console.log('🎬 選択された映画ID:', randomMovie.id);
        
        // 詳細情報を取得
        try {
          const detailResponse = await fetch(
            `${TMDB_BASE_URL}/movie/${randomMovie.id}?api_key=${TMDB_API_KEY}&language=ja-JP`
          );
          
          if (!detailResponse.ok) {
            console.error('❌ Detail API Error:', detailResponse.status);
            // 詳細が取得できなくても基本情報で返す
            return res.status(200).json({
              title: randomMovie.title || randomMovie.original_title,
              originalTitle: randomMovie.original_title,
              year: randomMovie.release_date ? new Date(randomMovie.release_date).getFullYear() : null,
              rating: randomMovie.vote_average ? randomMovie.vote_average.toFixed(1) : 'N/A',
              runtime: null,
              desc: randomMovie.overview || '説明がありません',
              poster: randomMovie.poster_path 
                ? `https://image.tmdb.org/t/p/w500${randomMovie.poster_path}` 
                : 'https://via.placeholder.com/500x750?text=No+Image',
              genres: ''
            });
          }

          const detailText = await detailResponse.text();
          const movieDetail = JSON.parse(detailText);

          console.log('✅ 映画詳細取得成功:', movieDetail.title);

          return res.status(200).json({
            title: movieDetail.title || movieDetail.original_title,
            originalTitle: movieDetail.original_title,
            year: movieDetail.release_date ? new Date(movieDetail.release_date).getFullYear() : null,
            rating: movieDetail.vote_average ? movieDetail.vote_average.toFixed(1) : 'N/A',
            runtime: movieDetail.runtime || null,
            desc: movieDetail.overview || '説明がありません',
            poster: movieDetail.poster_path 
              ? `https://image.tmdb.org/t/p/w500${movieDetail.poster_path}` 
              : 'https://via.placeholder.com/500x750?text=No+Image',
            genres: movieDetail.genres?.map(g => g.name).join(', ') || ''
          });
        } catch (detailError) {
          console.error('❌ Detail Error:', detailError.message);
          // エラーでも基本情報で返す
          return res.status(200).json({
            title: randomMovie.title || randomMovie.original_title,
            originalTitle: randomMovie.original_title,
            year: randomMovie.release_date ? new Date(randomMovie.release_date).getFullYear() : null,
            rating: randomMovie.vote_average ? randomMovie.vote_average.toFixed(1) : 'N/A',
            runtime: null,
            desc: randomMovie.overview || '説明がありません',
            poster: randomMovie.poster_path 
              ? `https://image.tmdb.org/t/p/w500${randomMovie.poster_path}` 
              : 'https://via.placeholder.com/500x750?text=No+Image',
            genres: ''
          });
        }
      }

      console.log(`❌ レベル ${level + 1} では見つかりませんでした。次のレベルへ...`);
    }

    // 全レベルで見つからなかった場合
    console.log('⚠️ 全レベルで映画が見つかりませんでした');
    return res.status(200).json({ 
      error: '申し訳ございません。条件に合う映画が見つかりませんでした。' 
    });

  } catch (error) {
    console.error('❌ 致命的エラー:', error);
    return res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      details: error.message 
    });
  }
}
