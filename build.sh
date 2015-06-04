#!/usr/bin/env bash

set -e

echo Compiling...
tsc eventlogging.ts

echo Minifying...
jsmin eventlogging.js > eventlogging.min.js
