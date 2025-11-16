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

    // 言語マッピング
    const languageMap = {
      ja: 'ja-JP',
      en: 'en-US',
      ko: 'ko-KR',
      zh: 'zh-CN',
      fr: 'fr-FR',
      other: '',
      any: ''
    };

    // 視聴時間マッピング
    const runtimeMap = {
      short: { min: 0, max: 90 },
      medium: { min: 90, max: 120 },
      long: { min: 120, max: 300 },
      any: { min: 0, max: 300 }
    };

    // 検索パラメータを構築
    let params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'ja-JP',
      'vote_count.gte': '50',
      include_adult: 'false'
    });

    // 1. アニメ or 実写
    if (answers.type === 'anime') {
      params.append('with_genres', '16');
    } else if (answers.type === 'live') {
      params.append('without_genres', '16');
    }
    // 'any'の場合は何も追加しない

    // 2. 受賞作品 / 人気作品 / 隠れた名作
    if (answers.award === 'award') {
      params.set('sort_by', 'vote_average.desc');
      params.set('vote_count.gte', '1000');
      params.append('vote_average.gte', '7.5');
    } else if (answers.award === 'popular') {
      params.set('sort_by', 'popularity.desc');
      params.set('vote_count.gte', '500');
    } else if (answers.award === 'hidden') {
      params.set('sort_by', 'vote_average.desc');
      params.set('vote_count.gte', '50');
      params.set('vote_count.lte', '500');
      params.append('vote_average.gte', '7.0');
    } else {
      params.set('sort_by', 'popularity.desc');
    }

    // 3. ジャンル
    if (answers.genre && answers.genre !== 'any' && genreMap[answers.genre]) {
      const currentGenres = params.get('with_genres');
      if (currentGenres) {
        params.set('with_genres', `${currentGenres},${genreMap[answers.genre]}`);
      } else {
        params.append('with_genres', genreMap[answers.genre]);
      }
    }

    // 4. 視聴時間
    if (answers.runtime && answers.runtime !== 'any' && runtimeMap[answers.runtime]) {
      const runtime = runtimeMap[answers.runtime];
      params.append('with_runtime.gte', runtime.min);
      params.append('with_runtime.lte', runtime.max);
    }

    // 5. 言語フィルター
    if (answers.language && answers.language !== 'any') {
      if (answers.language === 'ja') {
        params.append('with_original_language', 'ja');
      } else if (answers.language === 'en') {
        params.append('with_original_language', 'en');
      } else if (answers.language === 'ko') {
        params.append('with_original_language', 'ko');
      } else if (answers.language === 'zh') {
        params.append('with_original_language', 'zh');
      } else if (answers.language === 'fr') {
        params.append('with_original_language', 'fr');
      }
    }

    const url = `${TMDB_BASE_URL}/discover/movie?${params.toString()}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    const movieList = data.results || [];
    
    if (movieList.length > 0) {
      const topMovies = movieList.slice(0, Math.min(15, movieList.length));
      const randomMovie = topMovies[Math.floor(Math.random() * topMovies.length)];
      
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
