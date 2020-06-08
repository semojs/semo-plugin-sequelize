class DSNParser {
  parts: any = {}
  dsn: string

  constructor(dsn) {
    this.dsn = dsn || ''

    this.parts = {
      'dialect': null,
      'username': null,
      'password': null,
      'host': null,
      'port': null,
      'database': null,
      'options': {}
    }

    if (this.dsn) {
      this.parse()
    }
  }

  parse () {
    const regexp = new RegExp(
      '^' +
        '(?:' +
        '([^:\/?#.]+)' +					// dialect
        ':)?' +
        '(?:\/\/' +
        '(?:([^\/?#]*)@)?' +				// auth
        '([\\w\\d\\-\\u0100-\\uffff.%]*)' +	// host
        '(?::([0-9]+))?' +					// port
        ')?' +
        '([^?#]+)?' +						// database
        '(?:\\?([^#]*))?' +					// options
      '$'
    )
  
    const split = this.dsn.match(regexp)
    
    if (split) {

      const auth = split[2]?split[2].split(':'):[]
    
      this.parts = {
        'dialect': split[1],
        'username': auth[0] || null,
        'password': auth[1] || null,
        'host': split[3],
        'port': split[4] ? parseInt(split[4], 10) : null,
        'database': this.stripLeadingSlash(split[5]),
        'options': this.fromQueryOptions(split[6])
      }
    }
  
    return this
  }
  
  get (prop: string, def: any) {
    if (typeof(this.parts[prop]) !== 'undefined') {
      if (this.parts[prop] === null) {
        return def
      } else {
        return this.parts[prop]
      }
    } else
    if (typeof(def) !== 'undefined') {
      return def
    }
  
    return null
  }

  set (prop: string, value: any) {
    this.parts[prop] = value
  
    return this
  }

  getDSN () {
    var dsn = (this.parts.dialect || '') + '://'
          + (this.parts.username ? (
            (this.parts.username || '')
            + (this.parts.password ? ':' + this.parts.password : '') + '@')
            : '')
          + (this.parts.host || '')
          + (this.parts.port ? ':' + this.parts.port : '') + '/'
          + (this.parts.database || '')
  
    if (this.parts.options && Object.keys(this.parts.options).length > 0) {
      dsn += '?' + this.toQueryOptions(this.parts.options)
    }
  
    return dsn
  }

  getParts () {
    return this.parts
  }

  fromQueryOptions (options) {
    if (!options) {
      return {}
    }
  
    return JSON.parse('{"' + decodeURI(options).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}')
  }

  toQueryOptions (obj) {
    const str: any = []
    for (let p in obj) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
    }
    return str.join('&')
  }

  stripLeadingSlash (str) {
    str = str || ''
    if (str.substr(0, 1) === '/') {
      return str.substr(1, str.length)
    }

    return str
  }
}

export = DSNParser