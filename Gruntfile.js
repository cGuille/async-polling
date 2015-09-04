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
        uglify: {
            target: {
                options: {
                    mangle: false,
                    sourceMap: true,
                    sourceMapIn: 'dist/async-polling.js.map',
                },
                files: {
                    'dist/async-polling.min.js': ['dist/async-polling.js'],
                },
            },
        },
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['concat', 'uglify']);
};
