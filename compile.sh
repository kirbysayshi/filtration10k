#!/bin/bash
java -jar ./compiler-latest/compiler.jar --compilation_level=ADVANCED_OPTIMIZATIONS \
--js=filtration.js \
--js_output_file=filtration.min.js