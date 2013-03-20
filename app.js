var http=require('http'),
    fs = require('fs'),
    cheerio = require('cheerio'),
    wrench = require('wrench'),
    async = require('async'),
    _ = require('underscore');

var options= {
  root: 'g:/movies',
  dirPattern: /--- (.*) \(([0-9]{4})\) ---/,
  csfdRoot: 'http://www.csfd.cz',
  csfdSearch: '/hledat/?q='
}

console.log('reading json')
var json = JSON.parse(fs.readFileSync('list.json'))
console.log('Listed',_.size(json),'movies')

console.log('reading dir')
var list = [];
var dirMap = {};
_.each(wrench.readdirSyncRecursive(options.root), function(dir) {
  _.each(dir.split('\\'), function(part,i) {
    if (options.dirPattern.test(part)) {
      var match = options.dirPattern.exec(part);
      var m = match[1]+' ('+match[2]+')';
      list.push(m);
      dirMap[m] = dir.split('\\').slice(0,i+1).join('\\')
    }
  })
})


list = _.uniq(list)
console.log('found',list.length,'movies')

console.log('computing difference')
var listedIDs = _.map(json, function(m) {return m.id})
var toRead = _.difference(list, listedIDs)
console.log(toRead.length, 'movies to read')

async.eachSeries(toRead, function(movie,cb) {
  console.log('reading:', movie)
  getInfo(movie, function(err,info) {
    if (info) {
      json.push(_.defaults({id: movie, dir: dirMap[movie]}, info))
      fs.writeFileSync('list.json',JSON.stringify(json,null,2))
      fs.writeFileSync('list.js',"var mlist = { movies: "+JSON.stringify(json,null,2)+"}")
    }
    cb();
  })
})



function getInfo(movie, callback) {
  var url=options.csfdRoot+options.csfdSearch+encodeURIComponent(movie.replace(/´/g,''));
  http.get(url, function(res) {
    var response = ''
    res.on('data', function (chunk) {
      response += chunk;
    }).on('end', function() {
      var link = false;
      if (res.statusCode==302) {
        link = res.headers['location'];
      } else {
        var $ = cheerio.load(response);
        link = $('#search-films a').first().attr('href');
        if (link && link.indexOf('/')==0) link=options.csfdRoot+link; else link=false;
      }
      if (link) {
        http.get(link, function(res) {
          var response = ''
          res.on('data', function (chunk) {
            response += chunk;
          }).on('end', function() {
            var $ = cheerio.load(response);
            var origin = resolveOrigin($('.origin').text())
            var info = {
              url: link,
              title: $('.info h1').text().trim(),
              rating: $('#rating .average').text().trim(),
              genres: _.map($('.genre').text().split('/'), function(s) {return s.trim()}),
              countries: origin.countries,
              year: origin.year,
              length: origin.minutes,
              creators: getCreators($)
            }
            callback(null,info)
          });
        }).on('error', function(e) {
          console.log("couldn't fetch",options.csfdRoot+link)
          callback()
        });
      } else {
        console.log("couldn't find",movie)
        callback()
      }
    });
  }).on('error', function(e) {
    console.log("couldn't fetch",url)
    callback()
  });

}

function getCreators($) {
	var creators={};
	$('.creators div').each(function(){
		creators[$(this).find('h4').text().trim()] = $(this).find('a').map(function() {return $(this).text()})
	})
	return creators;
}

function resolveOrigin(s) {
  var arr = s.split(','), ret = {};
  _.each(arr, function (part) {
    part = part.trim();
    if (part==parseInt(part)) ret.year = part;
    else if (/[0-9]+ min/.test(part)) ret.minutes = part;
    else if (!_.has(ret,'countries')) ret.countries = _.map(part.split('/'), function(c) {return c.trim()})
  })
  return ret;
}