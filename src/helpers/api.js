async function getFeed(line=false) {
  if (!line) {
    line = 'all';
  }
  const response = await fetch(`/api/${line}`);
  return await response.json();
}

module.exports = {
  getFeed: getFeed
}