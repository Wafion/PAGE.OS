'use strict';

// Node.js 18 does not expose File as a global (added in Node 20).
// This minimal polyfill satisfies undici's webidl type-assertion at init time
// and the FormData.append Blob→File coercion path used by cheerio's HTTP helpers.
const { Blob } = require('node:buffer');

class File extends Blob {
  constructor(parts, name, options) {
    super(parts, options);
    this.name = name || '';
    this.lastModified = (options && options.lastModified != null) ? options.lastModified : Date.now();
  }
}

module.exports = File;
