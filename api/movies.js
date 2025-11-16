export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'NG' });
  const { answers, japaneseAwardMovies, genreMap } = req.body;
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
  if (!TMDB_API_KEY) return res.status(500).json({ error: 'APIキーなし' });
  try {
    if (answers.language === 'ja' && japaneseAwardMovies.length > 0) {
      const randomMovie = japaneseAwardMovies[Math.floor(Math.random() * japaneseAwardMovies.length)];
      const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(randomMovie.title)}&language=ja-JP`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      if (searchData.results && searchData.results.length > 0) {
        const movieId = searchData.results[0].id;
        const detailResponse = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=ja-JP`);
        const movieDetail = await detailResponse.json();
        return res.status(200).json({
          title: movieDetail.title || randomMovie.title,
          originalTitle: movieDetail.original_title,
          year: movieDetail.release_date ? new Date(movieDetail.release_date).getFullYear() : randomMovie.year,
          rating: movieDetail.vote_average ? movieDetail.vote_average.toFixed(1) : 'N/A',
          runtime: movieDetail.runtime || 'N/A',
          desc: movieDetail.overview || '日本の受賞作品です',
          poster: movieDetail.poster_path ? `https://image.tmdb.org/t/p/w500${movieDetail.poster_path}` : null,
          genres: movieDetail.genres?.map(g => g.name).join(', ') || '',
          isAward: randomMovie.isAward
        });
      }
    }
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28&sort_by=popularity.desc`;
    const response = await fetch(url);
    const data = await response.json();
    const movieList = data.results || [];
    if (movieList.length > 0) {
      const randomMovie = movieList[0];
      const detailResponse = await fetch(`${TMDB_BASE_URL}/movie/${randomMovie.id}?api_key=${TMDB_API_KEY}&language=ja-JP`);
      const movieDetail = await detailResponse.json();
      return res.status(200).json({
        title: movieDetail.title,
        desc: movieDetail.overview || '説明なし',
        rating: movieDetail.vote_average ? movieDetail.vote_average.toFixed(1) : 'N/A'
      });
    }
    return res.status(200).json({ error: '映画なし' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
