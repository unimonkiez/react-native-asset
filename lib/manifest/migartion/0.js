const sha1File = require('sha1-file');

module.exports = (assets) => {
  const assetsPathsAndSha1 = assets.reduce((arr, path) => {
    try {
      const sha1 = sha1File(path);

      return arr.concat({
        path,
        sha1,
      });
    } catch (err) {
      return arr;
    }
  }, []);

  const newData = assetsPathsAndSha1;

  return newData;
};
