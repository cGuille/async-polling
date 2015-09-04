module.exports = function (grunt) {
    'use strict';

    grunt.initConfig({
        concat: {
            options: {
                separator: ';\n',
                sourceMap: true,
            },
            dist: {
                src: ['lib/util.js', 'lib/event-emitter.js', 'src/async-polling.js'],
                dest: 'dist/async-polling.js',
            },
        },
    });

    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['concat']);
};
