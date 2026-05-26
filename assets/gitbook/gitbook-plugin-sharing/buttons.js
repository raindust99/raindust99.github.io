require(['gitbook'], function(gitbook) {
    gitbook.events.bind('start', function(e, config) {
        var githubLink = config.sharing.github_link || 'https://github.com';

        gitbook.toolbar.createButton({
            icon: 'fa fa-github',
            label: 'Github',
            position: 'right',
            onClick: function(event) {
                event.preventDefault();
                window.open(githubLink);
            }
        });
    });
});
