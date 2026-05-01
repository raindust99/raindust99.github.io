require(['gitbook'], function(gitbook) {
    gitbook.events.bind('start', function() {
        // Font settings toolbar button is intentionally disabled for this site.
    });
});
