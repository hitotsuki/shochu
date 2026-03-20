const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const shochu = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/shochu.json'), 'utf8'));

// 全件取得・検索・フィルター
app.get('/api/shochu', (req, res) => {
  const { q, type, prefecture, minAlcohol, maxAlcohol, sort, tag } = req.query;
  let results = [...shochu];

  // テキスト検索（名前、読み、蔵元、説明、タグ）
  if (q && q.trim()) {
    const keyword = q.trim().toLowerCase();
    results = results.filter(s =>
      s.name.toLowerCase().includes(keyword) ||
      s.nameKana.includes(keyword) ||
      s.brewery.toLowerCase().includes(keyword) ||
      s.prefecture.includes(keyword) ||
      s.city.includes(keyword) ||
      s.description.includes(keyword) ||
      s.type.includes(keyword) ||
      s.tags.some(t => t.includes(keyword)) ||
      s.ingredients.some(i => i.includes(keyword))
    );
  }

  // 原料タイプフィルター
  if (type && type !== 'all') {
    results = results.filter(s => s.type === type);
  }

  // 都道府県フィルター
  if (prefecture && prefecture !== 'all') {
    results = results.filter(s => s.prefecture === prefecture);
  }

  // アルコール度数フィルター
  if (minAlcohol) {
    results = results.filter(s => s.alcohol >= parseInt(minAlcohol));
  }
  if (maxAlcohol) {
    results = results.filter(s => s.alcohol <= parseInt(maxAlcohol));
  }

  // タグフィルター
  if (tag && tag !== 'all') {
    results = results.filter(s => s.tags.includes(tag));
  }

  // ソート
  switch (sort) {
    case 'name':
      results.sort((a, b) => a.nameKana.localeCompare(b.nameKana, 'ja'));
      break;
    case 'rating_desc':
      results.sort((a, b) => b.rating - a.rating);
      break;
    case 'price_asc':
      results.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      results.sort((a, b) => b.price - a.price);
      break;
    case 'alcohol_asc':
      results.sort((a, b) => a.alcohol - b.alcohol);
      break;
    case 'alcohol_desc':
      results.sort((a, b) => b.alcohol - a.alcohol);
      break;
    default:
      results.sort((a, b) => b.rating - a.rating);
  }

  res.json({
    total: results.length,
    results
  });
});

// 1件取得
app.get('/api/shochu/:id', (req, res) => {
  const item = shochu.find(s => s.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: '見つかりませんでした' });
  res.json(item);
});

// フィルター選択肢を返す
app.get('/api/options', (req, res) => {
  const types = [...new Set(shochu.map(s => s.type))].sort();
  const prefectures = [...new Set(shochu.map(s => s.prefecture))].sort();
  const allTags = [...new Set(shochu.flatMap(s => s.tags))].sort();
  res.json({ types, prefectures, tags: allTags });
});

app.listen(PORT, () => {
  console.log(`焼酎検索サービス起動中: http://localhost:${PORT}`);
});
