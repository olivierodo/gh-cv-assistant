module.exports = function (robot) {
  // -> STEPS 1 : Check if the action is created or added
  // -> STEPS 2 : Check if there is only one repository
  // -> STEPS 2-1 : If installed on organisation create issue
  // -> STEPS 3 : Check if the repository is public
  // -> STEPS 3-1 : If repo is private create an issue.
  // -> STEPS 4 : Check if the .github/cv-assistant exist in the repository

  return async context => {
    const {payload, github} = context

    if (!['created', 'added'].includes(payload.action)) return // check action : run script only on installation created

    if (payload.repositories && payload.repositories.length === 0) {
      throw new Error('Please specify a repository')
    };

    payload.repositories = payload.repositories || payload.repositories_added
    context.payload.repository = payload.repositories[0]
    context.payload.repository.owner = payload.sender

    if (payload.repositories.length !== 1) {
      const repos = payload.repositories.map(_ => _.full_name)
      robot.utils.issues.create(github, 'issue_multiple_repositories', payload.sender.login, repos)
      throw new Error('Multiple repositories found')
    };

    const repository = payload.repositories[0]

    if (repository.private === true) {
      robot.utils.issues.create(github, 'issue_private_repository', payload.sender.login, [repository.full_name])
      throw new Error('Private repositories found')
    }

    const config = await context.config('cv-assistant.yml')

    if (!config) {
      robot.utils.issues.create(github, 'issue_config_file_missing', payload.sender.login, [repository.full_name])
    }

    robot.utils.notify('New installation : ' + repository.full_name)
  }
}
