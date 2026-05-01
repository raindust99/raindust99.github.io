(function() {
    var sections = {
        '/network/': [
            { title: 'OSI 7\uacc4\uce35', url: '/network/osi-7-layer/' },
            { title: '\uc11c\ube0c\ub137 \ub9c8\uc2a4\ud06c', url: '/network/subnet-mask/' }
        ],
        '/lab/': [
            { title: 'VM\uc5d0 Rocky 9.7 \uc124\uce58 \ubc0f \uc124\uc815', url: '/lab/rocky-9-7-vm/' },
            { title: 'Windows 10, 11 \uc124\uce58 \ubc0f \uc124\uc815', url: '/lab/windows-10-11/' }
        ],
        '/project/': [
            { title: '\ubaa8\uc758\ud574\ud0b9', url: '/project/pentest/' }
        ]
    };

    function normalizePath(path) {
        return path.replace(/\/index\.html$/, '/');
    }

    function ensureTrigger(chapter, link) {
        if (link.querySelector('.exc-trigger')) return;

        var sectionUrl = link.getAttribute('href');
        var trigger = document.createElement('i');
        trigger.className = 'exc-trigger fa';
        trigger.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            chapter.classList.toggle('expanded');
            window.localStorage.setItem('sidebar-expanded-' + sectionUrl, chapter.classList.contains('expanded'));
        });

        link.appendChild(trigger);
    }

    function renderSectionLinks() {
        var currentPath = normalizePath(window.location.pathname);

        Object.keys(sections).forEach(function(sectionUrl) {
            var link = document.querySelector('.book-summary a[href="' + sectionUrl + '"]');
            if (!link) return;

            var chapter = link.closest('li.chapter');
            if (!chapter) return;

            var oldList = chapter.querySelector('ul');
            if (oldList) oldList.remove();

            var list = document.createElement('ul');
            var hasActiveChild = false;

            sections[sectionUrl].forEach(function(item) {
                var child = document.createElement('li');
                var childLink = document.createElement('a');

                childLink.href = item.url;
                childLink.textContent = item.title;

                if (currentPath === item.url) {
                    child.className = 'active';
                    hasActiveChild = true;
                }

                child.appendChild(childLink);
                list.appendChild(child);
            });

            chapter.appendChild(list);
            ensureTrigger(chapter, link);

            if (window.localStorage.getItem('sidebar-expanded-' + sectionUrl) === 'true') {
                chapter.classList.add('expanded');
            } else {
                chapter.classList.remove('expanded');
            }

            if (hasActiveChild) {
                chapter.classList.add('has-active-child');
            } else {
                chapter.classList.remove('has-active-child');
            }
        });
    }

    function scheduleRender() {
        renderSectionLinks();
        window.setTimeout(renderSectionLinks, 0);
        window.setTimeout(renderSectionLinks, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleRender);
    } else {
        scheduleRender();
    }

    if (window.require) {
        window.require(['gitbook'], function(gitbook) {
            gitbook.events.bind('page.change', scheduleRender);
            scheduleRender();
        });
    } else if (window.gitbook && window.gitbook.events) {
        window.gitbook.events.bind('page.change', scheduleRender);
    }
})();
