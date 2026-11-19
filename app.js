(function () {
  const app = document.querySelector('#app');
  const year = document.querySelector('#year');
  const posts = window.POSTS || [];
  const categoryOrder = ['开发技术', '工程实践', 'AI与工具', 'Java旧栈', '技术人文与软技能'];
  const categories = ['全部', ...categoryOrder.filter((category) => posts.some((post) => post.category === category))];
  const state = { category: '全部', query: '' };

  year.textContent = new Date().getFullYear();

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function slugify(value) {
    return String(value).toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/^-|-$/g, '');
  }

  function pathUrl(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function articleUrl(path) {
    return `${location.pathname}#post=${encodeURIComponent(path)}`;
  }

  function selectedPosts() {
    const query = state.query.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = state.category === '全部' || post.category === state.category;
      const matchesQuery = !query || `${post.title} ${post.category} ${post.excerpt}`.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }

  function renderCategories() {
    return categories.map((category) => {
      const count = category === '全部' ? posts.length : posts.filter((post) => post.category === category).length;
      return `<button class="category-button ${state.category === category ? 'is-active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}<span class="category-count">${count}</span></button>`;
    }).join('');
  }

  function renderCard(post) {
    return `<a class="post-card ${post.featured ? 'featured' : ''}" href="${articleUrl(post.path)}">
      <div class="post-kicker"><span>${escapeHtml(post.category)}</span>${post.featured ? '<span class="featured-dot" aria-label="精选文章"></span>' : ''}</div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.excerpt)}</p>
      <div class="post-card-footer"><span class="mono">Source / Markdown</span><span class="read-more">阅读文章 <span>→</span></span></div>
    </a>`;
  }

  function renderHome() {
    const visiblePosts = selectedPosts();
    app.innerHTML = `<section class="hero" id="home">
      <div class="hero-intro">
        <div class="hero-identity">
          <img class="author-avatar" src="assets/images/qi-shuihao.jpg" alt="" width="72" height="72" />
          <div class="hero-label"><span class="hero-index">01</span><span>柒水浩 / ENGINEERING LOG</span></div>
        </div>
        <h1>柒水浩的<br /><em>技术手记</em></h1>
        <p class="hero-copy">记录 Go、工程实践、AI 工具与职业成长。每篇文章都来自真实项目中的问题、判断和复盘。</p>
        <div class="hero-actions"><a class="hero-link" href="#notes">浏览文章 <span>→</span></a><span class="hero-note">Markdown source · Git tracked</span></div>
      </div>
      <aside class="hero-aside">
        <div class="aside-heading">Notes from the field</div>
        <p>不追逐热点，只留下能在下一次排查、设计和交付时派上用场的东西。</p>
        <div class="stats">
          <div class="stat"><span class="stat-value">${String(posts.length).padStart(2, '0')}</span><span class="stat-label">篇文章</span></div>
          <div class="stat"><span class="stat-value">${String(categories.length - 1).padStart(2, '0')}</span><span class="stat-label">个栏目</span></div>
          <div class="stat"><span class="stat-value">∞</span><span class="stat-label">持续更新</span></div>
        </div>
      </aside>
    </section>
    <section class="content-layout" id="notes">
      <aside class="sidebar"><p class="sidebar-title">栏目索引 / TOPICS</p><div class="category-list">${renderCategories()}</div></aside>
      <div class="feed">
        <div class="feed-top"><div><h2 class="feed-title">${state.category === '全部' ? '全部文章' : escapeHtml(state.category)}</h2><p class="feed-note">${visiblePosts.length} 篇记录，按主题整理。</p></div><label class="search-box"><span class="search-icon">⌕</span><input id="search" type="search" placeholder="搜索文章标题或主题" value="${escapeHtml(state.query)}" /></label></div>
        <div class="post-grid">${visiblePosts.length ? visiblePosts.map(renderCard).join('') : '<p class="empty-state">没有找到匹配的文章，换个关键词试试。</p>'}</div>
      </div>
    </section>`;
    bindHomeEvents();
  }

  function bindHomeEvents() {
    document.querySelectorAll('[data-category]').forEach((button) => {
      button.addEventListener('click', () => {
        state.category = button.dataset.category;
        renderHome();
        document.querySelector('#notes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    document.querySelector('#search')?.addEventListener('input', (event) => {
      state.query = event.target.value;
      const grid = document.querySelector('.post-grid');
      const visiblePosts = selectedPosts();
      grid.innerHTML = visiblePosts.length ? visiblePosts.map(renderCard).join('') : '<p class="empty-state">没有找到匹配的文章，换个关键词试试。</p>';
      document.querySelector('.feed-note').textContent = `${visiblePosts.length} 篇记录，按主题整理。`;
    });
  }

  function markdownInline(text, resolveSource) {
    const rawImages = [];
    const cleanText = String(text)
      .replace(/!\[点击并拖拽以移动\]\(data:image\/gif;base64,[^)]+\)/g, '')
      .replace(/<img\b([^>]*)>/gi, (_, attributes) => {
        const attribute = (name) => {
          const match = attributes.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
          return match ? match.slice(1).find((value) => value !== undefined) || '' : '';
        };
        const source = attribute('src');
        if (!source) return '';
        const zoom = attribute('style').match(/(?:^|;)\s*zoom\s*:\s*(\d+(?:\.\d+)?)%\s*(?:;|$)/i)?.[1];
        rawImages.push({ source, alt: attribute('alt'), zoom: zoom && Number(zoom) >= 10 && Number(zoom) <= 100 ? zoom : '' });
        return `\u0000raw-image-${rawImages.length - 1}\u0000`;
      })
      .replace(/<\/?font[^>]*>/gi, '')
      .replace(/<br\s*\/?>(?=.)/gi, '\n');
    let value = escapeHtml(cleanText);
    value = value.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img src="${resolveSource ? resolveSource(src) : src}" alt="${alt}" loading="lazy" />`);
    value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
    value = value.replace(/`([^`]+)`/g, '<code>$1</code>');
    value = value.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    value = value.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    value = value.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    value = value.replace(/_([^_]+)_/g, '<em>$1</em>');
    value = value.replace(/\u0000raw-image-(\d+)\u0000/g, (_, index) => {
      const image = rawImages[Number(index)];
      const source = escapeHtml(resolveSource ? resolveSource(image.source) : image.source);
      const alt = escapeHtml(image.alt);
      const zoom = image.zoom ? ` style="zoom:${image.zoom}%"` : '';
      return `<img src="${source}" alt="${alt}" loading="lazy"${zoom} />`;
    });
    return value;
  }

  function renderMarkdown(markdown, sourcePath) {
    const sourceDir = sourcePath.split('/').slice(0, -1).join('/');
    const resolveSource = (src) => {
      if (/^(https?:|data:|#|\/)/.test(src)) return src;
      return `${sourceDir}/${src}`.split('/').reduce((parts, part) => {
        if (part === '..') parts.pop(); else if (part !== '.') parts.push(part);
        return parts;
      }, []).map(encodeURIComponent).join('/');
    };
    const lines = markdown.replace(/\r/g, '').split('\n');
    const html = [];
    const headings = [];
    let paragraph = [];
    let list = null;
    let code = null;

    const inline = (text) => markdownInline(text, resolveSource);
    const flushParagraph = () => {
      if (paragraph.length) { html.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; }
    };
    const flushList = () => {
      if (list) { html.push(`</${list.type}>`); list = null; }
    };
    const flushCode = () => {
      if (code) { html.push(`<pre><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`); code = null; }
    };
    const tableCells = (line) => {
      const source = line.trim().replace(/^\|/, '').replace(/\|$/, '');
      const cells = [];
      let cell = '';
      let escaped = false;
      for (const character of source) {
        if (character === '|' && !escaped) { cells.push(cell.trim()); cell = ''; }
        else if (character === '\\' && !escaped) escaped = true;
        else { cell += character; escaped = false; }
      }
      cells.push(cell.trim());
      return cells;
    };
    const isTableDivider = (line) => {
      const cells = tableCells(line);
      return line.includes('|') && cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
    };
    const renderTable = (headerLine, dividerLine, rows) => {
      const headers = tableCells(headerLine);
      const alignments = tableCells(dividerLine).map((cell) => cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : cell.startsWith(':') ? 'left' : '');
      const renderCells = (cells, tag) => `<tr>${headers.map((_, index) => {
        const alignment = alignments[index];
        const style = alignment ? ` style="text-align:${alignment}"` : '';
        return `<${tag}${style}>${inline(cells[index] || '')}</${tag}>`;
      }).join('')}</tr>`;
      html.push(`<div class="table-wrap"><table><thead>${renderCells(headers, 'th')}</thead><tbody>${rows.map((row) => renderCells(tableCells(row), 'td')).join('')}</tbody></table></div>`);
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (code) {
        if (line.trim().startsWith('```')) flushCode(); else code.lines.push(line);
        continue;
      }
      if (line.trim().startsWith('```')) { flushParagraph(); flushList(); code = { lines: [] }; continue; }
      if (line.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
        flushParagraph(); flushList();
        const rows = [];
        index += 2;
        while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
          rows.push(lines[index]);
          index += 1;
        }
        renderTable(line, lines[index - rows.length - 1], rows);
        index -= 1;
        continue;
      }
      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        flushParagraph(); flushList();
        const level = heading[1].length;
        const text = heading[2].replace(/<[^>]+>/g, '').replace(/[*_`]/g, '').trim();
        const id = `${slugify(text)}-${headings.length}`;
        headings.push({ level, text, id });
        html.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);
        continue;
      }
      const imageOnly = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageOnly) {
        if (imageOnly[1] === '点击并拖拽以移动' && imageOnly[2].startsWith('data:image/gif;base64,')) continue;
        flushParagraph(); flushList(); html.push(`<img src="${resolveSource(imageOnly[2])}" alt="${escapeHtml(imageOnly[1])}" loading="lazy" />`); continue;
      }
      const bullet = line.match(/^\s*[-+*]\s+(.+)$/);
      const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
      if (bullet || ordered) {
        flushParagraph();
        const type = ordered ? 'ol' : 'ul';
        if (!list || list.type !== type) { flushList(); list = { type }; html.push(`<${type}>`); }
        list.items = (list.items || 0) + 1;
        html.push(`<li>${inline((bullet || ordered)[1])}</li>`);
        continue;
      }
      if (!line.trim()) { flushParagraph(); flushList(); continue; }
      if (line.startsWith('>')) { flushParagraph(); flushList(); html.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`); continue; }
      paragraph.push(line.trim());
    }
    flushCode(); flushParagraph(); flushList();
    let output = html.join('');
    output = output.replace(/href="([^\"]+\.md)"/g, (_, href) => `href="${articleUrl(resolveSource(href))}"`);
    return { html: output, headings };
  }

  async function renderArticle(path) {
    const post = posts.find((item) => item.path === path);
    if (!post) { renderHome(); return; }
    app.innerHTML = '<div class="loading">正在打开文章……</div>';
    try {
      const response = await fetch(pathUrl(path));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      const rendered = markdown.trim()
        ? renderMarkdown(markdown, path)
        : { html: '<p class="article-empty">这篇文章还没有正文内容，后续会继续补充。</p>', headings: [] };
      const wordCount = markdown.replace(/\s/g, '').length;
      app.innerHTML = `<article class="article-page">
        <div class="article-toolbar"><a class="back-link" href="#home">← 返回文章列表</a><div class="article-meta"><span>${escapeHtml(post.category)}</span><span>·</span><span>${wordCount.toLocaleString()} 字符</span></div></div>
        <header class="article-head"><p class="eyebrow">${escapeHtml(post.category)}</p><h1>${escapeHtml(post.title)}</h1><p class="article-lede">${escapeHtml(post.excerpt)}</p></header>
        <div class="article-layout"><div class="article-body">${rendered.html}</div><aside class="article-toc"><p class="toc-title">文章目录 / INDEX</p><nav class="toc-list">${rendered.headings.filter((heading) => heading.level <= 3).map((heading) => `<a href="#${heading.id}">${escapeHtml(heading.text)}</a>`).join('')}</nav></aside></div>
      </article>`;
      document.title = `${post.title} · 柒水浩的技术手记`;
      window.scrollTo(0, 0);
    } catch (error) {
      app.innerHTML = `<div class="error-box">这篇文章暂时无法加载。请确认 GitHub Pages 已经部署完整仓库，或稍后再试。</div>`;
      console.error(error);
    }
  }

  function route() {
    const hash = decodeURIComponent(location.hash.slice(1));
    const match = hash.match(/^post=(.+)$/);
    if (match) renderArticle(match[1]);
    else { document.title = '柒水浩 · 技术手记'; renderHome(); }
  }

  window.addEventListener('hashchange', route);
  route();
})();
