const rp = require('request-promise')
const moment = require('moment')

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

    
    const gitTree = await github.repos.getTree({tree_sha: 'master'});
    const nbFileExist = gitTree.tree
      .map( tree => {
        return files.some( file => tree.path.match(new RegExp(file)));
      })
      .filter(_ => _)
      .length;

    if (nbFileExist != files.length) {
      robot.utils.issues.create(github, 'issue_file_not_found', payload.sender.login, [payload.repository.full_name]);
      throw new Error('Please check your .github/cv-assistant.yml, some files are missing from your repository');
    }

    
/*
    const repo = 'https://github.com/olivierodo/test-cv'
    const file = 'resume.tex'
    const url = 'https://latexonline.cc/compile?git=' + repo + '&target=' + file + '&command=xelatex'
    try {
      let chunk = ''
      let options = {
        url,
        method: 'get',
        headers: {
          'User-Agent': 'wget'
        }
      };

      const chunck = await rp(options);
      // release(chunk)
    } catch (e) {
      console.log(e);
      robot.log(e)
    }
    */

    const release = async chunk => {
      const _repo = payload.repository.full_name.split('/')
      const config = {
        owner: _repo[0],
        repo: _repo[1],
        path: 'resume.tex',
        tag_name: moment().format('YYMMDD.HH.mm'),
        name: 'my First release',
        body: 'New update on the resume'

      }
      const buff = Buffer.from(chunk)
      const release = await github.repos.createRelease(config)
      const result = await github.repos.uploadAsset({
        url: release.data.upload_url,
        contentLength: buff.byteLength,
        contentType: 'application/pdf',
        file: buff,
        name: 'resume.pdf',
        label: 'resume'
      })
      robot.log(result)
    }
  }
}
