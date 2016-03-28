var fs = require("fs");
var path = require("path");
var parse = require("jsdoc-parse");

var repoPath = "../../discordie/";
var sourcePath = repoPath + "lib/";
var stream = parse({ src: sourcePath + "**" });

var repoPathAbs = path.normalize(path.resolve(repoPath));

var data = "";
stream.on("data", v => data += v);
stream.on("end", () => {
  var json = JSON.parse(data);
  json.forEach(e => {
    e.meta.path =
      path.normalize(e.meta.path)
      .replace(repoPathAbs, "")
      .replace(new RegExp("\\" + path.sep, "g"), "/");
  });
  fs.writeFileSync("docs.json", JSON.stringify(json, null, "  "));
});
