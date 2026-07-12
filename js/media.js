/* global require, process, BunBunMedia */
(function (api) {
  'use strict';
  var ffmpegCache;
  var finalExtensions = ['.mp4', '.mp3', '.m4a', '.webm', '.mkv', '.mov'];

  function recursiveFind(folder, filename, depth) {
    if (depth < 0) return '';
    var fs = require('fs'), path = require('path');
    try {
      var entries = fs.readdirSync(folder);
      for (var i = 0; i < entries.length; i += 1) {
        var full = path.join(folder, entries[i]), stat;
        try { stat = fs.statSync(full); } catch (e) { continue; }
        if (stat.isFile() && entries[i].toLowerCase() === filename.toLowerCase()) return full;
        if (stat.isDirectory()) { var found = recursiveFind(full, filename, depth - 1); if (found) return found; }
      }
    } catch (e) {}
    return '';
  }
  function ffmpeg() {
    if (ffmpegCache !== undefined) return ffmpegCache;
    var fs = require('fs'), path = require('path'), candidates = [api.bin('ffmpeg'), 'C:\\ffmpeg\\bin\\ffmpeg.exe'];
    candidates.push(path.join(process.env.ProgramFiles || 'C:\\Program Files', 'ffmpeg', 'bin', 'ffmpeg.exe'));
    try {
      var packages = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
      if (fs.existsSync(packages)) fs.readdirSync(packages).forEach(function (dir) {
        if (/ffmpeg/i.test(dir)) { var item = recursiveFind(path.join(packages, dir), 'ffmpeg.exe', 4); if (item) candidates.push(item); }
      });
    } catch (e) {}
    for (var i = 0; i < candidates.length; i += 1) if (api.exists(candidates[i])) { ffmpegCache = candidates[i]; return ffmpegCache; }
    try { if (require('child_process').spawnSync('ffmpeg', ['-version'], { windowsHide: true, timeout: 3000 }).status === 0) { ffmpegCache = 'ffmpeg'; return ffmpegCache; } } catch (e) {}
    ffmpegCache = ''; return '';
  }
  function ytdlp() { var bundled = api.bin('yt-dlp'); return api.exists(bundled) ? bundled : 'yt-dlp'; }
  function childEnvironment() {
    var path = require('path'), env = {};
    Object.keys(process.env).forEach(function (key) { env[key] = process.env[key]; });
    env.PATH = path.join(api.root(), 'bin') + (process.platform === 'win32' ? ';' : ':') + (env.PATH || '');
    return env;
  }
  function cookieArguments() {
    var source = api.byId('cookies').value;
    if (source === '__file__' && api.state.cookieFile) return ['--cookies', api.state.cookieFile];
    return source && source !== '__file__' ? ['--cookies-from-browser', source] : [];
  }
  function argumentsFor(url, quality, fallback, section) {
    var path = require('path'), args = ['--no-playlist', '--newline', '--windows-filenames', '--no-overwrites', '--retries', '3', '--fragment-retries', '3', '--socket-timeout', '30'];
    if (api.byId('verbose').checked) args.push('-v');
    var maximum = quality === 'best' ? 1080 : parseInt(quality, 10);
    var cap = '[height<=' + maximum + ']';
    var highResolution = quality === '1440' || quality === '2160';
    var recode = 'VideoConvertor:-c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p -c:a aac -b:a 320k';
    args = args.concat(cookieArguments());
    if (section) {
      args.push('--download-sections', section.argument, '--live-from-start');
      if (section.precise) args.push('--force-keyframes-at-cuts');
    }
    if (fallback && api.state.format !== 'audio') {
      if (ffmpeg()) args.push('-f', 'bestvideo[vcodec^=avc1]' + cap + '+bestaudio[ext=m4a]/bestvideo' + cap + '+bestaudio/best' + cap, '-S', 'res,vcodec:h264,acodec:aac,br', '--merge-output-format', 'mp4');
      else args.push('-f', 'best[ext=mp4]' + cap + '/best' + cap, '-S', 'res,vcodec:h264,br');
    } else if (api.state.format === 'audio') {
      args.push('-f', 'bestaudio[ext=m4a]/bestaudio');
      if (ffmpeg()) args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else if (api.state.format === 'video+audio') {
      if (ffmpeg() && highResolution) {
        args.push('-f', 'bestvideo' + cap + '+bestaudio/best' + cap, '-S', 'res,br', '--merge-output-format', 'mkv', '--recode-video', 'mp4', '--postprocessor-args', recode);
      } else if (ffmpeg()) {
        args.push('-f', 'bestvideo[vcodec^=avc1]' + cap + '+bestaudio[ext=m4a]/bestvideo' + cap + '+bestaudio/best' + cap, '-S', 'res,vcodec:h264,br', '--merge-output-format', 'mp4');
      } else args.push('-f', 'best[ext=mp4]' + cap + '/best' + cap, '-S', 'res,vcodec:h264,br');
    } else if (ffmpeg() && highResolution) {
      args.push('-f', 'bestvideo' + cap + '/best' + cap, '-S', 'res,br', '--merge-output-format', 'mkv', '--recode-video', 'mp4', '--postprocessor-args', recode);
    } else if (ffmpeg()) {
      args.push('-f', 'bestvideo[vcodec^=avc1]' + cap + '/bestvideo' + cap + '/best' + cap, '-S', 'res,vcodec:h264,br', '--merge-output-format', 'mp4');
    } else {
      args.push('-f', 'best[ext=mp4]' + cap + '/best' + cap, '-S', 'res,vcodec:h264,br');
    }
    if (ffmpeg() && ffmpeg() !== 'ffmpeg') args.push('--ffmpeg-location', ffmpeg());
    var suffix = section ? ' [cut ' + section.fileTag + ']' : '';
    args.push('-o', path.join(api.state.folder, '%(title)s [%(id)s]' + suffix + '.%(ext)s'), url);
    return args;
  }
  function removeCookieArguments(args) {
    var clean = [];
    for (var i = 0; i < args.length; i += 1) { if (args[i] === '--cookies' || args[i] === '--cookies-from-browser') { i += 1; } else clean.push(args[i]); }
    return clean;
  }
  function commandLine(executable, args) {
    function quote(value) {
      value = String(value);
      return /[\s\"]/.test(value) ? '"' + value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, '$1$1') + '"' : value;
    }
    return [executable].concat(args).map(quote).join(' ');
  }
  function outputById(id, section) {
    var fs = require('fs'), path = require('path');
    try {
      var files = fs.readdirSync(api.state.folder).filter(function (name) {
        return name.indexOf('[' + id + ']') >= 0 && (!section || name.indexOf('[cut ' + section.fileTag + ']') >= 0) && finalExtensions.some(function (ext) { return name.toLowerCase().endsWith(ext); });
      });
      files.sort(function (a, b) { return fs.statSync(path.join(api.state.folder, b)).mtimeMs - fs.statSync(path.join(api.state.folder, a)).mtimeMs; });
      return files.length ? path.join(api.state.folder, files[0]) : '';
    } catch (e) { return ''; }
  }
  function outputFromLog(log) {
    var patterns = [/\[ExtractAudio\]\s*Destination:\s*([^\r\n]+\.(?:mp3|m4a))/ig, /\[Merger\].*?"([^"]+\.(?:mp4|mkv|webm))"/ig, /Destination:\s*([^\r\n]+\.(?:mp4|mp3|m4a))/ig], fs = require('fs');
    for (var p = 0; p < patterns.length; p += 1) { var match, latest = ''; while ((match = patterns[p].exec(log))) latest = match[1].trim(); if (latest && fs.existsSync(latest)) return latest; }
    return '';
  }
  function cleanup() {
    var fs = require('fs'), path = require('path');
    try { fs.readdirSync(api.state.folder).forEach(function (name) { if (/\.(part|ytdl|temp|mkv|webm)$/i.test(name) || /\.part-|\.f\d+\.(mp4|m4a|webm|mkv)$/i.test(name)) try { fs.unlinkSync(path.join(api.state.folder, name)); } catch (e) {} }); } catch (e) {}
  }
  function validate(file) {
    if (!file || !api.exists(file) || api.state.format === 'audio') return !!file;
    var path = require('path'), probe = api.bin('ffprobe');
    if (!api.exists(probe) && ffmpeg() && ffmpeg() !== 'ffmpeg') probe = path.join(path.dirname(ffmpeg()), 'ffprobe.exe');
    if (!api.exists(probe)) { try { if (require('child_process').spawnSync('ffprobe', ['-version'], { timeout: 3000, windowsHide: true }).status === 0) probe = 'ffprobe'; else return true; } catch (e) { return true; } }
    try { var result = require('child_process').spawnSync(probe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { timeout: 15000, windowsHide: true }); return result.status === 0 && parseFloat(String(result.stdout)) > 0; } catch (e) { return false; }
  }
  function friendlyError(log) {
    var t = String(log).toLowerCase();
    if (/dpapi|failed to decrypt/.test(t)) return 'Browser sign-in failed. Close the browser, use Firefox, or select None.';
    if (/private video/.test(t)) return 'This video is private.';
    if (/age|confirm your age/.test(t) && /restricted|sign in|confirm/.test(t)) return 'This video requires a signed-in age-verified account.';
    if (/country|region/.test(t) && /blocked|available/.test(t)) return 'This video is not available in your country.';
    if (/members.only/.test(t)) return 'This is a members-only video.';
    if (/removed|video unavailable/.test(t)) return 'This video is unavailable or has been removed.';
    if (/429|too many requests/.test(t)) return 'YouTube rate-limited the request. Wait a few minutes and retry.';
    if (/ffmpeg/.test(t) && /not found|missing/.test(t)) return 'ffmpeg is missing. Run Setup.bat again.';
    if (/sign in|login/.test(t)) return 'YouTube requires sign-in for this video.';
    return 'Download failed. Check the URL, access permissions, and connection.';
  }

  api.media = {
    ffmpeg: ffmpeg, ytdlp: ytdlp, extensions: finalExtensions,
    verifyCookies: function (done) {
      var args = cookieArguments();
      if (!args.length) { done(false, 'Select a browser or cookie file first.'); return; }
      args = args.concat(['--simulate', '--no-warnings', '--no-playlist', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ']);
      var log = '', proc = require('child_process').spawn(ytdlp(), args, { windowsHide: true, env: childEnvironment() });
      proc.stdout.on('data', function (d) { log += d; }); proc.stderr.on('data', function (d) { log += d; });
      proc.on('error', function (e) { done(false, e.message); });
      proc.on('close', function (code) { done(code === 0, code === 0 ? 'YouTube sign-in works.' : friendlyError(log)); });
    },
    update: function (done) {
      var proc = require('child_process').spawn(ytdlp(), ['-U'], { windowsHide: true, env: childEnvironment() }), log = '';
      proc.stdout.on('data', function (d) { log += d; }); proc.stderr.on('data', function (d) { log += d; });
      proc.on('error', function (e) { done(false, e.message); }); proc.on('close', function (code) { done(code === 0, log.trim()); });
    },
    checkUpdate: function (done) {
      try {
        var current = require('child_process').execFileSync(ytdlp(), ['--version'], { timeout: 5000, windowsHide: true }).toString().trim();
        require('https').get({ hostname: 'api.github.com', path: '/repos/yt-dlp/yt-dlp/releases/latest', headers: { 'User-Agent': 'bunbun-media' } }, function (response) {
          var body = ''; response.on('data', function (d) { body += d; }); response.on('end', function () { try { done(JSON.parse(body).tag_name !== current); } catch (e) { done(false); } });
        }).on('error', function () { done(false); });
      } catch (e) { done(false); }
    },
    download: function (rawUrl, quality, section, handlers) {
      var id = api.videoId(rawUrl), url = id ? 'https://www.youtube.com/watch?v=' + id : rawUrl, cancelled = false, currentProcess = null;
      function cancel() {
        if (cancelled) return;
        cancelled = true;
        if (currentProcess && currentProcess.pid) {
          try {
            if (process.platform === 'win32') require('child_process').spawn('taskkill', ['/pid', String(currentProcess.pid), '/t', '/f'], { windowsHide: true });
            else currentProcess.kill('SIGTERM');
          } catch (e) {}
        }
        cleanup();
        if (handlers.cancelled) handlers.cancelled();
      }
      function run(args, options) {
        if (cancelled) return;
        var executable = ytdlp(), log = '', resolution = '';
        if (handlers.command) handlers.command(commandLine(executable, args));
        var proc = require('child_process').spawn(executable, args, { windowsHide: true, env: childEnvironment() });
        currentProcess = proc;
        proc.stdout.on('data', consume); proc.stderr.on('data', consume);
        function consume(data) { if (cancelled) return; var text = data.toString(); log += text; var pct = text.match(/(\d+(?:\.\d+)?)%/); var res = text.match(/(?:\d{3,4}x)?(\d{3,4})p?\b/); if (res) resolution = res[1] + 'p'; handlers.output(text, pct ? parseFloat(pct[1]) : null); }
        proc.on('error', function (e) { if (!cancelled) handlers.error('Could not start yt-dlp: ' + e.message); });
        proc.on('close', function (code) {
          if (cancelled) { cleanup(); return; }
          if (code !== 0 && options.cookies && /dpapi|failed to decrypt|could not copy.*cookie/i.test(log)) { handlers.retry('Sign-in failed; retrying as public video…'); run(removeCookieArguments(args), { cookies: false, format: options.format, age: true }); return; }
          if (code !== 0 && options.format && /403|forbidden|requested format|format is not available|fragment/i.test(log)) { handlers.retry('Selected stream failed; trying a compatible format…'); run(argumentsFor(url, quality, true, section), { cookies: false, format: false, age: false }); return; }
          if (code !== 0 && options.age && !cookieArguments().length && /age|confirm your age|sign in to confirm/i.test(log)) { var bypass = args.slice(); bypass.unshift('--extractor-args', 'youtube:player_client=tv_embedded,web_embedded,mediaconnect,default'); handlers.retry('Trying the public age-gate fallback…'); run(bypass, { cookies: false, format: true, age: false }); return; }
          if (code !== 0) { handlers.error(friendlyError(log)); return; }
          cleanup(); var file = outputFromLog(log) || outputById(id, section);
          if (!validate(file)) { try { require('fs').unlinkSync(file); } catch (e) {} handlers.error('The downloaded media was incomplete and has been removed. Please retry.'); return; }
          handlers.success(file, resolution);
        });
      }
      run(argumentsFor(url, quality, false, section), { cookies: cookieArguments().length > 0, format: true, age: true });
      return { cancel: cancel };
    }
  };
})(BunBunMedia);
