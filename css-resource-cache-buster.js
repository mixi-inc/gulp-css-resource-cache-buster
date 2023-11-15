(function() {
  'use strict';

  var url = require('url');
  var fs = require('fs');
  var crypto = require('crypto');

  var lodash = require('lodash');
  var request = require('@cypress/request');
  var through2 = require('through2');
  var PluginError = require('plugin-error');

  var CSS_URL_MATCHER = /(url\s*\(\s*['"]?)(.*?)(['"]?\s*\))/g;
  var PLUGIN_NAME = 'gulp-css-resource-cache-buster';


  /**
   * Cache buster for resources specified in CSS files.
   *
   * This stream add a query string to the resouce URLs in the CSS.
   * The query string is a MD5 of the resource. So, when the resource got changed,
   * an user agent can not use the cache, because the URL was changed.
   *
   * You should specify a URL converting table that is a map to URLs in the CSS to
   * the real URLs to the resource. This plugin fetch the resource to get the MD5
   * if the real URL is a remote URL.
   *
   * For example:
   *
   * <pre>
   * @font-face {
   *   font-family: 'MyFont';
   *   src: url('local/rel/file.eot') format('eot'),
   *        url('/local/abs/file.woff') format('woff'),
   *        url('/remote/file.ttf') format('truetype');
   * }
   * </pre>
   *
   * becomes:
   *
   * <pre>
   * @font-face {
   *   font-family: 'MyFont';
   *   src: url('local/rel/file.eot?md5-by-cache-buster=dbbe284acff8af485a7513fc14d8cabd') format('eot'),
   *        url('/local/abs/file.woff?md5-by-cache-buster=1c318b6e722437694bba4bed80aff46f') format('woff'),
   *        url('/remote/file.ttf?md5-by-cache-buster=ee25807e36fcdcdf4ea55311f15e3f66') format('truetype');
   * }
   * </pre>
   *
   * by the code:
   *
   * <pre>
   * gulp.src('path/to/file.css')
   *   .pipe(cssResourceCacheBuster({
   *     'local/rel/file.eot': './local/rel/file.eot',
   *     '/local/abs/file.woff': './local/abs/file.woff',
   *     '/remote/file.ttf': 'http://example.com/remote/file.ttf'
   *   }))
   *   .pipe(gulp.dest('path/to/modified-file.css'));
   * </pre>
   *
   * @param {!Object.<stirng, string>} urlDict URL converting table that is a map
   *     to URLs in the CSS to the real URLs to the resource.
   * @return {!stream.Transform} The transform stream.
   */
  var cssResourceCacheBuster = function(urlDict) {
      var stream = through2.obj(function(cssFile, enc, next) {

          if (cssFile.isStream()) {
              return next(new PluginError(PLUGIN_NAME, 'Streaming not supported'));
          }

          var promisedMd5Map = createPromisedMd5Map(urlDict);
          promisedMd5Map
              .then(function(md5Map) {
                  var cssContent = cssFile.contents.toString('utf8');
                  var modifiedCssContent = replaceUrl(cssContent, md5Map);
                  cssFile.contents = Buffer.from(modifiedCssContent);

                  next(null, cssFile);
              })
              .catch(function(error) {
                  next(new PluginError(PLUGIN_NAME, error), null);
              });
      });

      return stream;
  };


  function createPromisedMd5Map(urlDict) {
      return lodash(urlDict)
          .map(function(urlToCalcMd5, urlOnCss) {
              var promisedMd5 = calculateMd5(urlToCalcMd5);

              return promisedMd5.then(function(md5) {
                  return {
                      md5: md5,
                      urlOnCss: urlOnCss
                  };
              });
          })
          .thru(function(promisedMd5Entries) {
              return Promise.all(promisedMd5Entries);
          })
          .value()
          .then(function(md5Entries) {
              var md5Map = md5Entries.reduce(function(_md5Map, md5Entry) {
                  _md5Map[md5Entry.urlOnCss] = md5Entry.md5;
                  return _md5Map;
              }, {});

              return md5Map;
          });
  }


  function replaceUrl(cssContent, md5Map) {
      return cssContent.replace(CSS_URL_MATCHER, function(match, prefix, urlStr, postfix) {
          // If the URL is not specified by the filePathDict, we do not
          // add md5 as the query parameter.
          if (!md5Map[urlStr]) return match;

          var urlObj = url.parse(urlStr, true, true);
          urlObj.query['md5-by-cache-buster'] = md5Map[urlStr];

          // query (object; see querystring) will only be used if search is
          // absent. See https://nodejs.org/api/url.html#url_url_format_urlobj
          delete urlObj.search;

          return prefix + url.format(urlObj) + postfix;
      });
  }


  var RemoteUrlProtocols = {
      'http:': true,
      'https:': true
  };


  function isRemotePath(pathToCheck) {
      var urlObj = url.parse(pathToCheck, false, true);
      return urlObj.protocol in RemoteUrlProtocols;
  }


  function calculateMd5(urlToFile) {
      var promisedMd5 = new Promise(function(resolve, reject) {
          var md5sum = crypto.createHash('md5');
          md5sum.setEncoding('hex');

          var contentStream = isRemotePath(urlToFile) ?
              getContentByRemote(urlToFile) :
              getContentByLocal(urlToFile);

          contentStream.on('end', function() {
              md5sum.end();
              resolve(md5sum.read());
          });

          contentStream.on('error', reject);
          contentStream.pipe(md5sum);
      });

      return promisedMd5;
  }


  function getContentByRemote(urlToFile) {
      return request.get(urlToFile);
  }


  function getContentByLocal(pathToFile) {
      return fs.createReadStream(pathToFile);
  }


  module.exports = cssResourceCacheBuster;
})();
