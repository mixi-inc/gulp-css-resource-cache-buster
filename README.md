gulp-css-resource-cache-buster
==============================
[![Build Status](https://travis-ci.org/mixi-inc/gulp-css-resource-cache-buster.svg)](https://travis-ci.org/mixi-inc/gulp-css-resource-cache-buster)
[![npm version](https://badge.fury.io/js/gulp-css-resource-cache-buster.svg)](http://badge.fury.io/js/gulp-css-resource-cache-buster)

Cache buster for resources specified in CSS files.

This plugin add a query string to the resouce URLs in the CSS.
The query string is a MD5 of the resource. So, when the resource got changed,
an user agent can not use the cache, because the URL was changed.

You should specify a URL converting table that is a map to URLs in the CSS to
the real URLs to the resource. This plugin fetch the resource to get the MD5
if the real URL is a remote URL.

For example:

```css
@font-face {
  font-family: 'MyFont';
  src: url('local/rel/file.eot') format('eot'),
       url('/local/abs/file.woff') format('woff'),
       url('/remote/file.ttf') format('truetype');
}
```

becomes:

```css
@font-face {
  font-family: 'MyFont';
  src: url('local/rel/file.eot?md5-by-cache-buster=dbbe284acff8af485a7513fc14d8cabd') format('eot'),
       url('/local/abs/file.woff?md5-by-cache-buster=1c318b6e722437694bba4bed80aff46f') format('woff'),
       url('/remote/file.ttf?md5-by-cache-buster=ee25807e36fcdcdf4ea55311f15e3f66') format('truetype');
}
```

by the code:

```javascript
gulp.src('path/to/file.css')
  .pipe(cssResourceCacheBuster({
    'local/rel/file.eot': './local/rel/file.eot',
    '/local/abs/file.woff': './local/abs/file.woff',
    '/remote/file.ttf': 'http://example.com/remote/file.ttf'
  }))
  .pipe(gulp.dest('path/to/modified-file.css'));
```

Install
-------

```shell
npm install --save-dev gulp-css-resource-cache-buster
```


License
-------

MIT
