var bower, fs, logger, path, strategy, _addResolvedPath, _handlePackageJson, _isPathExcluded, _resolvePaths;

fs = require('fs');

path = require('path');

bower = require("bower-canary");

logger = require("logmimosa");

strategy = require('./strategy');

_handlePackageJson = function(aPath) {
  var details, err, mainPath, packageJson, packageJsonPath, _ref;
  packageJsonPath = path.join(aPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = require(packageJsonPath);
    } catch (_error) {
      err = _error;
      logger.error("Error reading package.json at [[ " + packageJsonPath + " ]]");
      return {};
    }
    details = {};
    if (packageJson.main) {
      mainPath = path.join(aPath, packageJson.main);
      if (fs.existsSync(mainPath)) {
        details.main = mainPath;
      }
    }
    details.dependencies = (_ref = packageJson.dependencies) != null ? _ref : void 0;
    return details;
  }
};

_resolvePaths = function(mimosaConfig, names, paths) {
  var aPath, fullLibPath, installedPaths, lib, packageJsonDetails, pathStat, resolvedPaths, _i, _len;
  installedPaths = {};
  names.forEach(function(name) {
    return installedPaths[name] = paths[name].split(",");
  });
  resolvedPaths = {};
  for (lib in installedPaths) {
    paths = installedPaths[lib];
    resolvedPaths[lib] = [];
    fullLibPath = path.join(mimosaConfig.bower.bowerDir.pathFull, lib);
    if (mimosaConfig.bower.copy.mainOverrides[lib]) {
      mimosaConfig.bower.copy.mainOverrides[lib].forEach(function(override) {
        var overridePath;
        overridePath = path.join(fullLibPath, override);
        if (fs.existsSync(overridePath)) {
          return _addResolvedPath(mimosaConfig, resolvedPaths[lib], overridePath);
        }
      });
    } else {
      for (_i = 0, _len = paths.length; _i < _len; _i++) {
        aPath = paths[_i];
        if (fs.existsSync(aPath)) {
          pathStat = fs.statSync(aPath);
          if (pathStat.isFile()) {
            _addResolvedPath(mimosaConfig, resolvedPaths[lib], aPath);
          } else {
            packageJsonDetails = _handlePackageJson(aPath);
            if (packageJsonDetails != null ? packageJsonDetails.main : void 0) {
              _addResolvedPath(mimosaConfig, resolvedPaths[lib], packageJsonDetails.main);
              /*
              TODO packageJsonDetails.dependencies
              */

            } else {
              logger.warn("Cannot determine main file for [[ " + lib + " ]] at [[ " + aPath + " ]]. Consider adding a mainOverrides entry.");
            }
          }
        } else {
          _addResolvedPath(mimosaConfig, resolvedPaths[lib], path.join(fullLibPath, aPath));
        }
      }
    }
  }
  return resolvedPaths;
};

_addResolvedPath = function(mimosaConfig, pathArray, thePath) {
  if (!_isPathExcluded(mimosaConfig.bower.copy, thePath)) {
    return pathArray.push(thePath);
  }
};

_isPathExcluded = function(copy, filePath) {
  if ((copy.excludeRegex != null) && filePath.match(copy.excludeRegex)) {
    return true;
  } else if (copy.exclude.indexOf(filePath) > -1) {
    return true;
  } else {
    return false;
  }
};

exports.gatherPathConfigs = function(mimosaConfig, installedNames, cb) {
  return bower.commands.list({
    paths: true
  }).on('end', function(paths) {
    var copyConfigs, resolvedPaths;
    resolvedPaths = _resolvePaths(mimosaConfig, installedNames, paths);
    copyConfigs = strategy(mimosaConfig, resolvedPaths);
    return cb(copyConfigs);
  });
};