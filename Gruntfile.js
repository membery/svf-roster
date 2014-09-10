module.exports = function(grunt) {

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-clean');
	
	
	grunt.registerTask('build:server', [ 'copy:server','copy:templates','copy:sharedJsServer','copy:ssl','copy:css','copy:img','copy:fonts']);
	
	grunt.registerTask('build', [ 'build:server']);

	grunt.registerTask('default', ['build']);

	grunt.initConfig({
		copy: {
			
			bower: {
				files: [
					{expand: true, cwd: 'bower_components', src: ['**'], dest: 'build/client/lib/'}
				]
			},
			server: {
				files: [
					{expand: true, cwd: 'src/server', src: ['**'], dest: 'build/server/'}
				]
			},
			templates: {
				files: [
					{expand: true, cwd: 'src/server/templates', src: ['**'], dest: 'build/server/templates'}
				]
			},
			ssl: {
				files: [
					{expand: true, cwd: 'ssl', src: ['**'], dest: 'build/server/ssl'}
				]
			},
			css: {
				files: [
					{expand: true, cwd: 'src/client/css', src: ['**'], dest: 'build/client/css/'}
				]
			},
			  
			fonts: {
				files: [
					{expand: true, cwd: 'src/client/font', src: ['**'], dest: 'build/client/font/'}
				]
			},
		  
			img: {
				files: [
					{expand: true, cwd: 'src/client/img', src: ['**'], dest: 'build/client/img'}
				]
			},
			
		
			sharedJsServer: {
				files: [
					{expand: true, cwd: 'src/shared/js', src: ['**'], dest: 'build/server'}
				]
			}
		},
		
		watch: {
			server: {
				files: ['src/server/**'],
				tasks: ['build:server']
			},
		},
		_clean: {
			build: ['build/'],
			node_modules: ['node_modules/'],
			bower_components: ['bower_components/']
		},
		env: {
			test: {
				NODE_ENV: 'test'
			}
		}
	});
};
