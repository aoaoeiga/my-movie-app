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

    // 基本パラメータ
    let params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'ja-JP',
      sort_by: 'popularity.desc',
      include_adult: 'false',
      'vote_count.gte': '10'  // 緩和: 10票以上
    });

    // 優先度1: アニメ or 実写（最優先）
    if (answers.type === 'anime') {
      params.append('with_genres', '16');
    } else if (answers.type === 'live') {
      params.append('without_genres', '16');
    }

    // 優先度2: ジャンル
    if (answers.genre && answers.genre !== 'any' && genreMap[answers.genre]) {
      const currentGenres = params.get('with_genres');
      if (currentGenres) {
        params.set('with_genres', `${currentGenres},${genreMap[answers.genre]}`);
      } else {
        params.append('with_genres', genreMap[answers.genre]);
      }
    }

    // 優先度3: 年代フィルター
    if (answers.decade && answers.decade !== 'any' && decadeMap[answers.decade]) {
      const decade = decadeMap[answers.decade];
      params.append('primary_release_date.gte', decade.min);
      params.append('primary_release_date.lte', decade.max);
    }

    // 優先度4: 受賞作品 / 人気作品 / 隠れた名作
    if (answers.award === 'award') {
      params.set('sort_by', 'vote_average.desc');
      params.set('vote_count.gte', '500');  // 緩和
      params.append('vote_average.gte', '7.0');  // 緩和
    } else if (answers.award === 'popular') {
      params.set('sort_by', 'popularity.desc');
      params.set('vote_count.gte', '100');  // 緩和
    } else if (answers.award === 'hidden') {
      params.set('sort_by', 'vote_average.desc');
      params.set('vote_count.gte', '20');  // 緩和
      params.set('vote_count.lte', '500');
      params.append('vote_average.gte', '6.5');  // 緩和
    }

    // 優先度5: 言語フィルター
    if (answers.language && answers.language !== 'any') {
      const langCode = answers.language;
      if (['ja', 'en', 'ko', 'zh', 'fr'].includes(langCode)) {
        params.append('with_original_language', langCode);
      }
    }

    // 優先度6: 視聴時間（緩く適用）
    if (answers.runtime && answers.runtime !== 'any' && runtimeMap[answers.runtime]) {
      const runtime = runtimeMap[answers.runtime];
      params.append('with_runtime.gte', runtime.min);
      params.append('with_runtime.lte', runtime.max);
    }

    // デバッグ用：URLをログ出力
    console.log('API URL:', `${TMDB_BASE_URL}/discover/movie?${params.toString()}`);

    const url = `${TMDB_BASE_URL}/discover/movie?${params.toString()}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Results count:', data.results?.length || 0);
    
    const movieList = data.results || [];
    
    if (movieList.length > 0) {
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
        genres: movieDetail.genres?.map(g => g.name).join(', ') || ''
      });
    }

    // 結果が0件の場合、条件を緩めて再検索
    console.log('No results found, retrying with relaxed conditions...');
    
    // 超シンプル検索（ジャンルのみ）
    const simpleParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'ja-JP',
      sort_by: 'popularity.desc',
      include_adult: 'false'
    });

    // アニメ or 実写だけ適用
    if (answers.type === 'anime') {
      simpleParams.append('with_genres', '16');
    } else if (answers.type === 'live') {
      simpleParams.append('without_genres', '16');
    }

    // ジャンルだけ適用
    if (answers.genre && answers.genre !== 'any' && genreMap[answers.genre]) {
      const currentGenres = simpleParams.get('with_genres');
      if (currentGenres) {
        simpleParams.set('with_genres', `${currentGenres},${genreMap[answers.genre]}`);
      } else {
        simpleParams.append('with_genres', genreMap[answers.genre]);
      }
    }

    const simpleUrl = `${TMDB_BASE_URL}/discover/movie?${simpleParams.toString()}`;
    const simpleResponse = await fetch(simpleUrl);
    const simpleData = await simpleResponse.json();
    const simpleMovieList = simpleData.results || [];

    if (simpleMovieList.length > 0) {
      const randomMovie = simpleMovieList[Math.floor(Math.random() * Math.min(20, simpleMovieList.length))];
      
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
        genres: movieDetail.genres?.map(g => g.name).join(', ') || ''
      });
    }

    return res.status(200).json({ 
      error: '条件に合う映画が見つかりませんでした。条件を変えてみてください。' 
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました: ' + error.message });
  }
}
