const rp = require('request'),
      moment = require('moment'),
      fs = require('fs');

module.exports = function (robot) {
  // -> STEPS 1 : Check if there is an action on the master branch
  // -> STEPS 2 : compile and fetch the latex files
  // -> STEPS 3 : Create a release
  // -> STEPS 4 : Add the pdf file to the release
  // -> STEPS 5 : update the stable tag
 
  return async context => {
    const {payload, github} = context

    if (payload.ref != 'refs/heads/master') return

    const config = await context.config('cv-assistant.yml');

    const files = config.files.filter(_ => _.match(/^(.*).tex/));

    if (files.length !== config.files.length) {
      robot.utils.issues.create(github, 'issue_config_invalid_file', payload.sender.login, [payload.repository.full_name]);
      throw new Error('Please check your .github/cv-assistant.yml, the files need to be latex type (.tex)');
    }

    const fullName = payload.repository.full_name.split('/');
    const gitTreeConfig = {
      owner: fullName[0],
      repo : fullName[1],
      sha: 'master'
    };
    const gitTree = await github.gitdata.getTree(gitTreeConfig);
    const treeFiles = gitTree.data.tree
      .map( tree => {
        return {
          match: files.some( file => tree.path.match(new RegExp(file))),
          name: tree.path
        };
      })
      .filter(_ => _.match)
      .map(_ => _.name);

    if (treeFiles.length != files.length) {
      robot.utils.issues.create(github, 'issue_file_not_found', payload.sender.login, [payload.repository.full_name]);
      throw new Error('Please check your .github/cv-assistant.yml, some files are missing from your repository');
    }


    const requests = treeFiles.map(file => {
      const url = [
        'https://latexonline.cc/compile?git=',
        'https://github.com/',
        payload.repository.full_name,
        '&target=',
        file,
        '&command=xelatex'
      ].join('');
      
      return new Promise((resolve, reject) => {
        const options = {
          url,
          headers: {
            'User-Agent': 'wget'
          }
        };

        let path = 'file-' + Date.now() + '.pdf';
        let error = undefined;

        const pipe = fs
          .createWriteStream(path)
          .on('close', () => {
            if (error) {
              resolve({file, error});
              return;
            }
            fs.readFile(path, (err, data) => {
              resolve({file, data});
              fs.unlinkSync(path);
            });
          });

        rp.get(options, (err, res, body) =>{
          if (err || 200 != res.statusCode) {
            error = err || new Error(body);
          }
        }).pipe(pipe);
      });
    });
   
    const results = await Promise.all(requests)

    const fails = results.filter(result => result.error)
    fails.forEach(result => {
      robot.utils.issues.create(github, 'issue_fail_compile', payload.sender.login, [payload.repository.full_name], result);
    });

    const successResults = results.filter(result => !result.error);
    robot.utils.release.create(github, payload.sender.login, payload.repository.full_name, successResults);
  }
}
