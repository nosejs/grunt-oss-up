/*
 * grunt-oss-up
 * https://github.com/marshalYuan/grun-oss-up
 *
 * Copyright (c) 2014 marshalYuan
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks
	var OSS = require('ali-oss'),
		async = require('async'),
		path = require('path'),
		fs = require('fs'),
		chalk = require('chalk');

	grunt.registerMultiTask('oss', '一个上传静态文件到阿里云OSS的GRUNT工具', function() {
		var done = this.async();
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options({
			/**
             * @name objectGen --return a aliyun oss object name
			 *					  default return grunt task files' dest + files' name
             * @param dest  --grunt task files' dest
             * @param src  --grunt task files' src
             */
			objectGen: function(dest, src){
				return [dest, path.basename(src)].join('\/');
			}
		});

		if(!options.accessKeyId || !options.accessKeySecret || !options.bucket){
			grunt.fail.fatal('accessKeyId, accessKeySecret 以及 bucket 必须填写!');
		}
		var option = {
				accessKeyId: options.accessKeyId,
				accessKeySecret: options.accessKeySecret
			};
		//creat a new oss-client
		var	oss = OSS(options),
			uploadQue = [];
		// Iterate over all specified file groups.
		this.files.forEach(function(f) {
			// Concat specified files.
			var objects = f.src.filter(function(filepath) {
				// Warn on and remove invalid source files (if nonull was set).
				if (!grunt.file.exists(filepath)) {
					grunt.log.warn('源文件 "' + filepath + '" 未找到.');
					return false;
				} else {
					return true;
				}
			}).map(function(filepath) {
				// return an oss object.
				return {
					bucket: options.bucket,
					object: options.objectGen(f.dest, filepath),
					srcFile: filepath
				};

			});
			objects.forEach(function(o) {
				uploadQue.push(o);
			});
		});
		var uploadTasks = [];
		uploadQue.forEach(function(o) {
			uploadTasks.push(makeUploadTask(o));
		});
		grunt.log.ok('开始上传文件.')
		async.series(uploadTasks, function(error, results) {
			if (error) {
				grunt.fail.fatal("上传错误:"+ JSON.stringify(error));
			} else {
				grunt.log.ok('所有文件已经上传!');
			}
			done(error, results);
		});
		/**
		 * @name makeUploadTask  -- make task for async
		 * @param object  --aliyun oss object
		 */
		function makeUploadTask(o) {
			return function(callback) {
				//skip object when object's path is a directory;
				if( fs.lstatSync(o.srcFile).isDirectory() ){
					grunt.log.error(chalk.cyan(o.srcFile) + chalk.red(' 是目录, 忽略!'));
					callback();
				}else {
					grunt.log.ok('开始上传文件'+ chalk.cyan(o.srcFile));
					oss.put(o, function (error, result) {
						callback(error, result);
					});
				}
			}
		}
	});
};
