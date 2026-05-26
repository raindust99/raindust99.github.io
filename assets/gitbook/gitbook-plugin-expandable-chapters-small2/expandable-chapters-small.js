require(['gitbook'], function(gitbook) {
    gitbook.events.bind('page.change', function() {
        // Sidebar expansion is handled by assets/gitbook/custom-local.js.
    });
});
