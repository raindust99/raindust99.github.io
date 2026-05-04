(function() {
    var sections = {
        '/network/': [
            { title: 'OSI 7\uacc4\uce35', url: '/network/osi-7-layer/' }
        ],
        '/lab/': [
            { title: 'VMWare NAT \uc124\uc815', url: '/lab/vmware-nat/' },
            { title: 'VMWare\uc5d0 Rocky 9.7 \uc124\uce58', url: '/lab/rocky-9-7-vm/' },
            { title: 'VMWare\uc5d0 Windows 10, 11 \uc124\uce58', url: '/lab/windows-10-11/' }
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
        chapter.classList.add('has-custom-children');

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

        var aboutLink = document.querySelector('.book-summary a[href="/about/"]');
        var aboutChapter = aboutLink && aboutLink.closest('li.chapter');
        var previous = aboutChapter && aboutChapter.previousElementSibling;
        if (aboutChapter && (!previous || !previous.classList.contains('divider'))) {
            var divider = document.createElement('li');
            divider.className = 'divider custom-about-divider';
            aboutChapter.parentNode.insertBefore(divider, aboutChapter);
        }
    }

    function scheduleRender() {
        renderSectionLinks();
        formatSearchResults();
        renderPageToc();
        window.setTimeout(renderSectionLinks, 0);
        window.setTimeout(formatSearchResults, 0);
        window.setTimeout(renderPageToc, 0);
        window.setTimeout(renderSectionLinks, 100);
        window.setTimeout(formatSearchResults, 100);
        window.setTimeout(renderPageToc, 100);
    }

    function slugify(value) {
        return value
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-가-힣]/g, '');
    }

    function renderPageToc() {
        var oldToc = document.querySelector('.page-toc');
        if (oldToc) oldToc.remove();

        var content = document.querySelector('.markdown-section');
        if (!content) return;

        var headings = Array.from(content.querySelectorAll('h2, h3'));
        if (headings.length === 0) return;

        var toc = document.createElement('nav');
        toc.className = 'page-toc';

        var title = document.createElement('div');
        title.className = 'page-toc-title';
        title.textContent = '목차';
        toc.appendChild(title);

        var list = document.createElement('ul');

        headings.forEach(function(heading, index) {
            if (!heading.id) {
                heading.id = slugify(heading.textContent) || 'section-' + index;
            }

            var item = document.createElement('li');
            item.className = 'page-toc-' + heading.tagName.toLowerCase();

            var link = document.createElement('a');
            link.href = '#' + heading.id;
            link.textContent = heading.textContent;
            link.addEventListener('click', function(event) {
                event.preventDefault();
                heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', '#' + heading.id);
            });

            item.appendChild(link);
            list.appendChild(item);
        });

        toc.appendChild(list);
        document.body.appendChild(toc);
    }

    function formatSearchResults() {
        var labels = [
            'VMWare NAT \uc124\uc815',
            'VMWare\uc5d0 Rocky 9.7 \uc124\uce58',
            'VMWare\uc5d0 Windows 10, 11 \uc124\uce58',
            'OSI 7\uacc4\uce35',
            '\ubaa8\uc758\ud574\ud0b9'
        ];
        var queryElement = document.querySelector('.search-query');
        var query = queryElement ? queryElement.textContent : '';

        function escapeHtml(value) {
            return value
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');
        }

        function escapeRegExp(value) {
            return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function highlight(value) {
            var escaped = escapeHtml(value);
            if (!query) return escaped;

            return escaped.replace(
                new RegExp('(' + escapeRegExp(escapeHtml(query)) + ')', 'gi'),
                '<span class="search-highlight-keyword">$1</span>'
            );
        }

        document.querySelectorAll('.search-results-list .search-results-item p').forEach(function(result) {
            var text = result.textContent;
            var matchedLabels = labels.filter(function(label) {
                return text.indexOf(label) !== -1;
            });

            if (matchedLabels.length < 2) return;

            result.innerHTML = matchedLabels.map(function(label) {
                return '<span class="search-result-line">' + highlight(label) + '</span>';
            }).join('');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleRender);
    } else {
        scheduleRender();
    }

    document.addEventListener('keyup', function(event) {
        if (event.target && event.target.matches('#book-search-input input, #book-search-input-inside input')) {
            window.setTimeout(formatSearchResults, 150);
        }
    });

    function bindGitbookEvents(gitbook) {
        if (!gitbook || !gitbook.events) return;

        if (typeof gitbook.events.bind === 'function') {
            gitbook.events.bind('page.change', scheduleRender);
        } else if (typeof gitbook.events.on === 'function') {
            gitbook.events.on('page.change', scheduleRender);
        }

        scheduleRender();
    }

    if (typeof require === 'function') {
        require(['gitbook'], bindGitbookEvents);
    } else if (window.gitbook) {
        bindGitbookEvents(window.gitbook);
    }
})();
