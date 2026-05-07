(function() {
    var sections = {
        '/network/': [
            { title: 'OSI 7\uacc4\uce35', url: '/network/osi-7-layer/' }
        ],
        '/lab/': [
            {
                title: 'VMware \uad6c\uc131 \uc2e4\uc2b5',
                url: '/lab/vmware/',
                key: 'vmware',
                children: [
                    { title: 'VMware NAT \uc124\uc815', url: '/lab/vmware-nat/' },
                    { title: 'VMware\uc5d0 Rocky 9.4 \uc124\uce58 \ubc0f \uc124\uc815', url: '/lab/rocky-9-7-vm/' },
                    { title: 'VMware\uc5d0 Windows 10, 11 \uc124\uce58 \ubc0f \uc124\uc815', url: '/lab/windows-10-11/' },
                    { title: 'VMware Clone\uc73c\ub85c \uac00\uc0c1\uba38\uc2e0 \ubcf5\uc81c\ud558\uae30', url: '/lab/vmware-clone/' }
                ]
            },
            {
                title: '\uc11c\ubc84 \uc2e4\uc2b5',
                url: '/lab/server/',
                key: 'server',
                children: [
                    { title: 'Rocky Linux\uc5d0 DHCP \uc11c\ubc84 \uad6c\uc131\ud558\uae30', url: '/lab/rocky-dhcp-server/' }
                ]
            }
        ],
        '/project/': [
            { title: '\ubaa8\uc758\ud574\ud0b9', url: '/project/pentest/' }
        ]
    };

    function normalizePath(path) {
        return path.replace(/\/index\.html$/, '/');
    }
    var builtContentStatus = {
        '/network/osi-7-layer/': true,
        '/lab/vmware-nat/': true,
        '/lab/rocky-9-7-vm/': true
    };
    var contentStatusCache = {};

    function pageHasBodyContentFromHtml(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var content = doc.querySelector('.markdown-section');
        if (!content) return false;

        var clone = content.cloneNode(true);
        clone.querySelectorAll('h1, script, style').forEach(function(node) {
            node.remove();
        });

        return clone.textContent.replace(/\s+/g, '').length > 0 || clone.querySelector('img, pre, table, blockquote');
    }

    function getPageContentStatus(url) {
        if (Object.prototype.hasOwnProperty.call(builtContentStatus, url)) {
            return Promise.resolve(!!builtContentStatus[url]);
        }

        if (contentStatusCache[url]) return contentStatusCache[url];

        contentStatusCache[url] = fetch(url, { credentials: 'same-origin' })
            .then(function(response) {
                if (!response.ok) return false;
                return response.text();
            })
            .then(function(html) {
                return typeof html === 'string' && pageHasBodyContentFromHtml(html);
            })
            .catch(function() {
                return false;
            });

        return contentStatusCache[url];
    }

    function setSidebarCount(label, count) {
        if (!label) return;

        var trigger = label.querySelector('.exc-trigger');
        var baseTitle = label.dataset.sidebarBaseTitle;

        if (!baseTitle) {
            baseTitle = Array.from(label.childNodes)
                .filter(function(node) { return node.nodeType === Node.TEXT_NODE; })
                .map(function(node) { return node.textContent; })
                .join(' ')
                .replace(/\s+/g, ' ')
                .replace(/\s*\(\d+\)\s*$/, '')
                .trim();

            if (!baseTitle) {
                baseTitle = label.textContent
                    .replace(/\s+/g, ' ')
                    .replace(/\s*\(\d+\)\s*$/, '')
                    .trim();
            }

            label.dataset.sidebarBaseTitle = baseTitle;
        }

        Array.from(label.childNodes).forEach(function(node) {
            if (node.nodeType === Node.TEXT_NODE) node.remove();
        });

        var titleText = document.createTextNode(baseTitle + ' (' + count + ')');
        if (trigger) {
            label.insertBefore(titleText, trigger);
        } else {
            label.appendChild(titleText);
        }
    }

    function findDirectSidebarChild(list, key) {
        if (!list) return null;
        return Array.from(list.children).find(function(child) {
            return child.dataset && child.dataset.sidebarItemKey === key;
        }) || null;
    }

    function getLeafUrls(items, urls) {
        urls = urls || [];
        items.forEach(function(item) {
            if (item.children && item.children.length) {
                getLeafUrls(item.children, urls);
            } else if (item.url) {
                urls.push(item.url);
            }
        });
        return urls;
    }

    function countContentItems(items, statusMap) {
        return items.reduce(function(total, item) {
            if (item.children && item.children.length) {
                return total + countContentItems(item.children, statusMap);
            }
            return total + (statusMap[item.url] ? 1 : 0);
        }, 0);
    }

    function collectCategoryCounts(items, statusMap, counts) {
        items.forEach(function(item) {
            if (item.children && item.children.length) {
                if (item.url) {
                    counts[item.url] = countContentItems(item.children, statusMap);
                }
                collectCategoryCounts(item.children, statusMap, counts);
            }
        });
    }

    function applyContentStatus(items, list, statusMap, storagePrefix) {
        var total = 0;

        items.forEach(function(item) {
            var key = storagePrefix + '-' + (item.key || item.url);
            var element = findDirectSidebarChild(list, key);
            if (!element) return;

            var count = 0;
            if (item.children && item.children.length) {
                count = applyContentStatus(item.children, element.querySelector(':scope > ul'), statusMap, key);
                element.classList.toggle('is-hidden-by-empty-content', count === 0);
                setSidebarCount(element.querySelector(':scope > a, :scope > span'), count);
            } else {
                count = statusMap[item.url] ? 1 : 0;
                element.classList.toggle('is-hidden-by-empty-content', count === 0);
            }

            total += count;
        });

        return total;
    }

    function refreshPageContentLinks(statusMap) {
        var content = document.querySelector('.markdown-section');
        if (!content) return;

        Object.keys(statusMap).forEach(function(url) {
            content.querySelectorAll('a[href="' + url + '"]').forEach(function(link) {
                var item = link.closest('li');
                if (item) {
                    item.classList.add('is-managed-content-link');
                    item.classList.toggle('is-visible-by-content', !!statusMap[url]);
                    item.classList.toggle('is-hidden-by-empty-content', !statusMap[url]);
                }
            });
        });
    }

    function refreshPageCategoryLinks(categoryCounts) {
        var content = document.querySelector('.markdown-section');
        if (!content) return;

        Object.keys(categoryCounts).forEach(function(url) {
            content.querySelectorAll('a[href="' + url + '"]').forEach(function(link) {
                var item = link.closest('li');
                if (item) {
                    item.classList.add('is-managed-content-link');
                    item.classList.toggle('is-visible-by-content', categoryCounts[url] > 0);
                    item.classList.toggle('is-hidden-by-empty-content', categoryCounts[url] === 0);
                }
            });
        });
    }

    function refreshSidebarContentStatus() {
        var urls = [];
        Object.keys(sections).forEach(function(sectionUrl) {
            getLeafUrls(sections[sectionUrl], urls);
        });

        Promise.all(urls.map(function(url) {
            return getPageContentStatus(url).then(function(hasContent) {
                return { url: url, hasContent: hasContent };
            });
        })).then(function(results) {
            var statusMap = {};
            results.forEach(function(result) {
                statusMap[result.url] = result.hasContent;
            });

            var categoryCounts = {};
            Object.keys(sections).forEach(function(sectionUrl) {
                var link = document.querySelector('.book-summary a[href="' + sectionUrl + '"]');
                var chapter = link && link.closest('li.chapter');
                var list = chapter && chapter.querySelector(':scope > ul');
                collectCategoryCounts(sections[sectionUrl], statusMap, categoryCounts);

                if (!chapter || !list) return;
                var count = applyContentStatus(sections[sectionUrl], list, statusMap, 'sidebar-expanded-' + sectionUrl);
                chapter.classList.remove('is-hidden-by-empty-content');
                setSidebarCount(link, count);
            });

            refreshPageContentLinks(statusMap);
            refreshPageCategoryLinks(categoryCounts);
        });
    }
    function removeStandaloneLabPages() {
        ['/lab/vmware/', '/lab/server/'].forEach(function(url) {
            document.querySelectorAll('.book-summary li.chapter[data-path="' + url + '"]').forEach(function(chapter) {
                chapter.remove();
            });
        });
    }

    function ensureTrigger(chapter, link) {
        var sectionUrl = link.getAttribute('href');
        chapter.classList.add('has-custom-children');

        link.querySelectorAll('.exc-trigger').forEach(function(oldTrigger) {
            oldTrigger.remove();
        });

        var trigger = document.createElement('i');
        trigger.className = 'exc-trigger fa';
        trigger.setAttribute('aria-label', 'Toggle submenu');
        trigger.setAttribute('title', 'Toggle submenu');
        trigger.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            chapter.classList.toggle('expanded');
            trigger.setAttribute('aria-expanded', chapter.classList.contains('expanded'));
            window.sessionStorage.setItem('sidebar-expanded-' + sectionUrl, chapter.classList.contains('expanded'));
        });

        link.appendChild(trigger);
    }

    function ensureNestedTrigger(item, label, storageKey) {
        item.classList.add('has-custom-children');

        label.querySelectorAll('.exc-trigger').forEach(function(oldTrigger) {
            oldTrigger.remove();
        });

        var trigger = document.createElement('i');
        trigger.className = 'exc-trigger fa';
        trigger.setAttribute('aria-label', 'Toggle submenu');
        trigger.setAttribute('title', 'Toggle submenu');
        trigger.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            item.classList.toggle('expanded');
            trigger.setAttribute('aria-expanded', item.classList.contains('expanded'));
            window.sessionStorage.setItem(storageKey, item.classList.contains('expanded'));
        });

        label.appendChild(trigger);

        if (label.tagName.toLowerCase() === 'span') {
            label.addEventListener('click', function(event) {
                if (event.target === trigger) return;
                item.classList.toggle('expanded');
                trigger.setAttribute('aria-expanded', item.classList.contains('expanded'));
                window.sessionStorage.setItem(storageKey, item.classList.contains('expanded'));
            });
        }
    }

    function createSidebarItem(item, currentPath, storagePrefix) {
        var child = document.createElement('li');
        var label;
        var hasActiveChild = false;

        if (item.url) {
            label = document.createElement('a');
            label.href = item.url;
            label.textContent = item.title;

            if (currentPath === item.url) {
                child.classList.add('active');
                hasActiveChild = true;
            }
        } else {
            label = document.createElement('span');
            label.textContent = item.title;
        }

        child.dataset.sidebarItemKey = storagePrefix + '-' + (item.key || item.url);
        if (item.url) child.dataset.sidebarItemUrl = item.url;
        child.appendChild(label);

        if (item.children && item.children.length) {
            var nestedList = document.createElement('ul');
            var storageKey = storagePrefix + '-' + item.key;

            item.children.forEach(function(nestedItem) {
                var nested = createSidebarItem(nestedItem, currentPath, storageKey);
                if (nested.hasActiveChild) hasActiveChild = true;
                nestedList.appendChild(nested.element);
            });

            child.appendChild(nestedList);
            ensureNestedTrigger(child, label, storageKey);

            if (window.sessionStorage.getItem(storageKey) === 'true') {
                child.classList.add('expanded');
            } else {
                child.classList.remove('expanded');
            }

            var initialCount = countContentItems(item.children, builtContentStatus);
            child.classList.toggle('is-hidden-by-empty-content', initialCount === 0);
            setSidebarCount(label, initialCount);
        }

        if ((!item.children || item.children.length === 0) && item.url && !builtContentStatus[item.url]) {
            child.classList.add('is-hidden-by-empty-content');
        }

        return {
            element: child,
            hasActiveChild: hasActiveChild
        };
    }

    function renderSectionLinks() {
        var currentPath = normalizePath(window.location.pathname);
        window.localStorage.removeItem('expChapters');

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
                var rendered = createSidebarItem(item, currentPath, 'sidebar-expanded-' + sectionUrl);
                if (rendered.hasActiveChild) hasActiveChild = true;
                list.appendChild(rendered.element);
            });

            chapter.appendChild(list);
            ensureTrigger(chapter, link);
            setSidebarCount(link, countContentItems(sections[sectionUrl], builtContentStatus));

            if (window.sessionStorage.getItem('sidebar-expanded-' + sectionUrl) === 'true') {
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
        removeStandaloneLabPages();
        renderSectionLinks();
        formatSearchResults();
        renderPageToc();
        refreshSidebarContentStatus();
        window.setTimeout(removeStandaloneLabPages, 0);
        window.setTimeout(renderSectionLinks, 0);
        window.setTimeout(refreshSidebarContentStatus, 10);
        window.setTimeout(formatSearchResults, 0);
        window.setTimeout(renderPageToc, 0);
        window.setTimeout(removeStandaloneLabPages, 100);
        window.setTimeout(renderSectionLinks, 100);
        window.setTimeout(refreshSidebarContentStatus, 130);
        window.setTimeout(formatSearchResults, 100);
        window.setTimeout(renderPageToc, 100);
        window.setTimeout(removeStandaloneLabPages, 300);
        window.setTimeout(renderSectionLinks, 300);
        window.setTimeout(removeStandaloneLabPages, 800);
        window.setTimeout(renderSectionLinks, 800);
        window.setTimeout(refreshSidebarContentStatus, 850);
    }

    function slugify(value) {
        return value
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-\uAC00-\uD7A3]/g, '');
    }

    function renderPageToc() {
        var oldToc = document.querySelector('.page-toc');
        if (oldToc) oldToc.remove();

        var oldToggle = document.querySelector('.page-toc-toggle');
        if (oldToggle) oldToggle.remove();

        var content = document.querySelector('.markdown-section');
        if (!content) return;

        var headings = Array.from(content.querySelectorAll('h2, h3'));
        if (headings.length === 0) return;

        var toc = document.createElement('nav');
        toc.className = 'page-toc';

        var title = document.createElement('div');
        title.className = 'page-toc-title';
        title.textContent = '\ubaa9\ucc28';
        toc.appendChild(title);

        var list = document.createElement('ul');
        var tocLinks = [];

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
                setActiveTocLine(index);
            });

            item.appendChild(link);
            list.appendChild(item);
            tocLinks.push({ heading: heading, link: link });
        });

        toc.appendChild(list);

        var toggle = document.createElement('button');
        toggle.className = 'page-toc-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-label', '\ubaa9\ucc28 \uc5f4\uae30');

        headings.forEach(function(heading, index) {
            var line = document.createElement('span');
            line.dataset.tocIndex = index;
            toggle.appendChild(line);
        });

        function setActiveTocLine(activeIndex) {
            toggle.querySelectorAll('span').forEach(function(line, index) {
                line.classList.toggle('active', index === activeIndex);
            });
            tocLinks.forEach(function(item, index) {
                item.link.classList.toggle('active', index === activeIndex);
            });
        }

        function isNearScrollBottom() {
            var bodyInner = document.querySelector('.body-inner');
            var scroller = bodyInner && bodyInner.scrollHeight > bodyInner.clientHeight ? bodyInner : document.documentElement;
            var scrollTop = scroller === document.documentElement ? (window.pageYOffset || scroller.scrollTop) : scroller.scrollTop;
            return scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8;
        }

        function updateActiveTocLine() {
            if (isNearScrollBottom()) {
                setActiveTocLine(headings.length - 1);
                return;
            }

            var activeIndex = 0;
            headings.forEach(function(heading, index) {
                if (heading.getBoundingClientRect().top <= 140) {
                    activeIndex = index;
                }
            });
            setActiveTocLine(activeIndex);
        }

        document.body.appendChild(toggle);
        document.body.appendChild(toc);

        updateActiveTocLine();
        var bodyInner = document.querySelector('.body-inner');
        if (bodyInner) bodyInner.addEventListener('scroll', updateActiveTocLine, { passive: true });
        window.addEventListener('scroll', updateActiveTocLine, { passive: true });
    }
    function formatSearchResults() {
        var labels = [
            'VMware NAT \uc124\uc815',
            'VMware\uc5d0 Rocky 9.4 \uc124\uce58 \ubc0f \uc124\uc815',
            'VMware\uc5d0 Windows 10, 11 \uc124\uce58 \ubc0f \uc124\uc815',
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


