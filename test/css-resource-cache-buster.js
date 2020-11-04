'use strict';

var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

var multiline = require('multiline');
var lodash = require('lodash');
var cssResourceCacheBuster = require('../css-resource-cache-buster');


describe('cssResourceCacheBuster', function() {
  it('should replace a local URL that is in the specified URL convert table', function(done) {
    var stream = cssResourceCacheBuster({
      'path/to/local/file': '/dev/null'
    });

    stream.on('data', function(file) {
      expect(String(file.contents)).to.equal(
        'src: url(path/to/local/file?md5-by-cache-buster=d41d8cd98f00b204e9800998ecf8427e)');
      done();
    });

    // Make debugging easy
    stream.on('error', function(error) {
      console.log(error.stack);
    });

    stream.write(createFileStub('src: url(path/to/local/file)'));
    stream.end();
  });


  it('should replace a remote URL that is in the specified URL convert table', function(done) {
    var stream = cssResourceCacheBuster({
      'path/to/remote/file': 'http://devnull-as-a-service.com/dev/null'
    });

    stream.on('data', function(file) {
      expect(String(file.contents)).to.equal(
        'src: url(path/to/remote/file?md5-by-cache-buster=d41d8cd98f00b204e9800998ecf8427e)');
      done();
    });

    // Make debugging easy
    stream.on('error', function(error) {
      console.log(error.stack);
    });

    stream.write(createFileStub('src: url(path/to/remote/file)'));
    stream.end();
  });


  it('should replace URLs that is not in the specified URL convert table', function(done) {
    var stream = cssResourceCacheBuster({
      'path/to/local/file': '/dev/null',
      'path/to/remote/file': 'http://devnull-as-a-service.com/dev/null',
    });
    var cssContent = multiline(function() {/*
src: url(path/to/remote/file);
src: url(path/to/local/file);
*/});

    stream.on('data', function(file) {
      var expectedCssContent = multiline(function() {/*
src: url(path/to/remote/file?md5-by-cache-buster=d41d8cd98f00b204e9800998ecf8427e);
src: url(path/to/local/file?md5-by-cache-buster=d41d8cd98f00b204e9800998ecf8427e);
*/});

      expect(String(file.contents)).to.equal(expectedCssContent);
      done();
    });

    // Make debugging easy
    stream.on('error', function(error) {
      console.log(error.stack);
    });

    stream.write(createFileStub(cssContent));
    stream.end();
  });


  it('should ignore URLs that is not in the specified URL convert table', function(done) {
    var stream = cssResourceCacheBuster({});

    stream.on('data', function(file) {
      expect(String(file.contents)).to.equal(
        'src: url(path/to/file)');
      done();
    });

    // Make debugging easy
    stream.on('error', function(error) {
      console.log(error.stack);
    });

    stream.write(createFileStub('src: url(path/to/file)'));
    stream.end();
  });


  function createFileStub(content) {
    return {
      isNull: lodash.constant(false),
      isStream: lodash.constant(false),
      contents: Buffer.from(content),
    };
  }
});
