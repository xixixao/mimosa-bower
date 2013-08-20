"use strict"

path = require 'path'
fs = require 'fs'

_ = require 'lodash'
logger = require 'logmimosa'

utils = require "./utils"

_writeJSON = (json, outPath) ->
  jsonString = JSON.stringify json, null, 2
  utils.makeDirectory path.dirname(outPath)
  fs.writeFileSync outPath, jsonString

_readBowerJSON = (mimosaConfig) ->
  bowerJSONPath = path.join mimosaConfig.root, "bower.json"
  require bowerJSONPath

_lastInstallBowerJSONPath = (mimosaConfig) ->
  path.join mimosaConfig.root, '.mimosa', 'bower', 'last-install.json'

_lastMimosaConfigJSONPath = (mimosaConfig) ->
  path.join mimosaConfig.root, '.mimosa', 'bower', 'last-mimosa-config.json'

_lastInstalledFileListPath = (mimosaConfig) ->
  path.join mimosaConfig.root, '.mimosa', 'bower', 'last-installed-files.json'

_isEqual = (obj1, obj2) ->
  JSON.stringify(obj1) is JSON.stringify(obj2)

exports.track = (mimosaConfig, installedFiles) ->
  bowerConfigOutPath = _lastMimosaConfigJSONPath mimosaConfig

  currentBowerConfig = _.cloneDeep(mimosaConfig.bower)
  currentBowerConfig.bowerDir.pathFull = ""
  currentBowerConfig.copy.exclude = []
  _writeJSON currentBowerConfig, bowerConfigOutPath

  bowerJSON = _readBowerJSON mimosaConfig
  bowerJSONOutPath = _lastInstallBowerJSONPath mimosaConfig
  _writeJSON bowerJSON, bowerJSONOutPath

  _writeInstalledFiles mimosaConfig, installedFiles

_writeInstalledFiles = (mimosaConfig, installedFiles) ->
  outPath = _lastInstalledFileListPath mimosaConfig

  filesMinusRoot = for installedFile in installedFiles
    installedFile.replace mimosaConfig.root + path.sep, ''

  _writeJSON filesMinusRoot, outPath

exports.removeTrackFiles = (mimosaConfig) ->
  [_lastInstallBowerJSONPath(mimosaConfig)
  _lastMimosaConfigJSONPath(mimosaConfig)
  _lastInstalledFileListPath(mimosaConfig)].forEach (filepath) ->
    if fs.existsSync filepath
      fs.unlinkSync filepath

exports.getPreviousInstalledFileList = (mimosaConfig) ->
  installedFilePath = _lastInstalledFileListPath mimosaConfig
  try
    require installedFilePath
  catch err
    logger.debug err
    []

exports.isInstallNeeded = (mimosaConfig) ->
  try
    oldBowerJSON = require _lastInstallBowerJSONPath(mimosaConfig)
    logger.debug "Found old bower json"
  catch err
    logger.debug "Could not find old bower json, install needed", err
    return true

  try
    oldBowerConfig = require _lastMimosaConfigJSONPath(mimosaConfig)
    logger.debug "Found old bower config"
  catch err
    logger.debug "Could not find old bower config, install needed", err
    return true

  currentBowerConfig = _.cloneDeep(mimosaConfig.bower)
  currentBowerConfig.bowerDir.pathFull = ''
  currentBowerConfig.copy.exclude = []
  currentBowerJSON = _readBowerJSON mimosaConfig

  if _isEqual(currentBowerConfig, oldBowerConfig) and _isEqual(currentBowerJSON, oldBowerJSON)
    logger.debug "Old bower config matches current, and older bower.json matches current"
    false
  else
    true