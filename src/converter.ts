import { App } from 'obsidian';
import RedPlugin from './main';

export class RedConverter {
    private static app: App;
    private static plugin: RedPlugin;

    static initialize(app: App, plugin: RedPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    static hasValidContent(element: HTMLElement): boolean {
        const settings = this.plugin?.settingsManager?.getSettings();
        const headingLevel = settings?.headingLevel || 'h1';
        const headers = element.querySelectorAll(headingLevel);
        return headers.length > 0;
    }

    static formatContent(element: HTMLElement): void {
        const settings = this.plugin?.settingsManager?.getSettings();
        const headingLevel = settings?.headingLevel || 'h1';
        const headers = Array.from(element.querySelectorAll(headingLevel));
        
        if (headers.length === 0) {
            element.empty();
            const tip = element.createEl('div', {
                cls: 'red-empty-message',
                text: `⚠️ 温馨提示
                        请使用${headingLevel === 'h1' ? '一级标题(#)' : '二级标题(##)'}来分割内容
                        每个${headingLevel === 'h1' ? '一级标题' : '二级标题'}将生成一张独立的图片
                        现在编辑文档，实时预览效果`
            });
            // 触发自定义事件
            element.dispatchEvent(new CustomEvent('content-validation-change', { 
                detail: { isValid: false },
                bubbles: true 
            }));
            return;
        }

        // 触发自定义事件表示内容有效
        element.dispatchEvent(new CustomEvent('content-validation-change', { 
            detail: { isValid: true },
            bubbles: true 
        }));

        // 创建预览容器
        const previewContainer = document.createElement('div');
        previewContainer.className = 'red-preview-container';

        // 创建图片预览区域
        const imagePreview = document.createElement('div');
        imagePreview.className = 'red-image-preview';
        
        // 创建复制按钮
        const copyButton = document.createElement('button');
        copyButton.className = 'red-copy-button';
        copyButton.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 12.4316V7.8125C13 6.2592 14.2592 5 15.8125 5H40.1875C41.7408 5 43 6.2592 43 7.8125V32.1875C43 33.7408 41.7408 35 40.1875 35H35.5163" stroke="#9b9b9b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M32.1875 13H7.8125C6.2592 13 5 14.2592 5 15.8125V40.1875C5 41.7408 6.2592 43 7.8125 43H32.1875C33.7408 43 35 41.7408 35 40.1875V15.8125C35 14.2592 33.7408 13 32.1875 13Z" fill="none" stroke="#9b9b9b" stroke-width="4" stroke-linejoin="round"/></svg>';
        copyButton.title = '复制图片';
        copyButton.setAttribute('aria-label', '复制图片到剪贴板');
        
        // 添加复制按钮到预览容器
        previewContainer.appendChild(copyButton);

        // 创建三个主要区域
        const headerArea = document.createElement('div');
        headerArea.className = 'red-preview-header';

        const contentArea = document.createElement('div');
        contentArea.className = 'red-preview-content';

        const footerArea = document.createElement('div');
        footerArea.className = 'red-preview-footer';

        // 创建内容容器
        const contentContainer = document.createElement('div');
        contentContainer.className = 'red-content-container';
        
        // 封面 section
        const coverSettings = this.plugin?.settingsManager?.getSettings();
        // 清除旧遮罩
        imagePreview.querySelector('.red-cover-overlay')?.remove();

        if (coverSettings?.showCover) {
            const opacity = (coverSettings.coverOverlayOpacity ?? 35) / 100;
            const overlay = document.createElement('div');
            overlay.className = 'red-cover-overlay';
            overlay.style.background = `rgba(0,0,0,${opacity})`;
            overlay.style.display = 'none'; // 默认隐藏，由导航状态控制
            imagePreview.insertBefore(overlay, imagePreview.firstChild);

            contentContainer.appendChild(this.createCoverSection(
                coverSettings.coverTitle || '',
                coverSettings.coverFirstFontSize ?? 18,
                coverSettings.coverBodyFontSize ?? 28,
                coverSettings.coverOverlayOpacity ?? 35,
                coverSettings.coverBoxOffsetY ?? 0
            ));
        }

        // 处理每个二级标题及其内容
        headers.forEach((header, index) => {
            const section = this.createContentSection(header, index);
            if (section) {
                contentContainer.appendChild(section);
            }
        });

        // 组装结构
        contentArea.appendChild(contentContainer);
        imagePreview.appendChild(headerArea);
        imagePreview.appendChild(contentArea);
        imagePreview.appendChild(footerArea);
        previewContainer.appendChild(imagePreview);

        // 处理完成后再清空原容器并添加新内容
        element.empty();
        element.appendChild(previewContainer);

        // 触发自定义事件，通知 view 添加复制按钮事件监听
        const copyEvent = new CustomEvent('copy-button-added', { 
            detail: { copyButton },
            bubbles: true 
        });
        element.dispatchEvent(copyEvent);
    }

    private static createCoverSection(coverTitle: string, firstSize: number, bodySize: number, overlayOpacity: number, offsetY: number): HTMLElement {
        const section = document.createElement('section');
        section.className = 'red-content-section red-cover-section';
        section.setAttribute('data-index', 'cover');

        // 内容主体
        const body = document.createElement('div');
        body.className = 'red-cover-body';

        const box = document.createElement('div');
        box.className = 'red-cover-box';

        const titleEl = document.createElement('div');
        titleEl.className = 'red-cover-title';
        titleEl.setAttribute('title', '点击编辑封面标题');

        const lines = (coverTitle || '点击输入标题').split('\n').filter(l => l.trim());
        lines.forEach((line, i) => {
            if (i > 0) titleEl.appendChild(document.createElement('br'));
            const span = document.createElement('span');
            span.className = i === 0 ? 'red-cover-line-first' : 'red-cover-line-rest';
            span.style.fontSize = `${i === 0 ? firstSize : bodySize}px`;
            span.textContent = line;
            titleEl.appendChild(span);
        });

        box.appendChild(titleEl);
        if (offsetY !== 0) box.style.marginTop = `${offsetY}px`;
        body.appendChild(box);
        section.appendChild(body);

        // 字号控件（导出时隐藏）
        const controls = document.createElement('div');
        controls.className = 'red-cover-controls red-no-export';

        const addSizeGroup = (label: string, target: string, val: number) => {
            const lbl = document.createElement('span');
            lbl.className = 'red-cover-size-label';
            lbl.textContent = label;

            const dec = document.createElement('button');
            dec.className = 'red-cover-size-btn';
            dec.dataset.target = target;
            dec.dataset.action = 'dec';
            dec.textContent = '−';

            const display = document.createElement('span');
            display.className = 'red-cover-size-val';
            display.dataset.target = target;
            display.textContent = String(val);

            const inc = document.createElement('button');
            inc.className = 'red-cover-size-btn';
            inc.dataset.target = target;
            inc.dataset.action = 'inc';
            inc.textContent = '+';

            controls.appendChild(lbl);
            controls.appendChild(dec);
            controls.appendChild(display);
            controls.appendChild(inc);
        };

        addSizeGroup('首行', 'first', firstSize);
        const sep1 = document.createElement('span');
        sep1.className = 'red-cover-size-sep';
        sep1.textContent = '|';
        controls.appendChild(sep1);
        addSizeGroup('正文', 'body', bodySize);
        const sep2 = document.createElement('span');
        sep2.className = 'red-cover-size-sep';
        sep2.textContent = '|';
        controls.appendChild(sep2);
        addSizeGroup('遮罩', 'opacity', overlayOpacity);
        const sep3 = document.createElement('span');
        sep3.className = 'red-cover-size-sep';
        sep3.textContent = '|';
        controls.appendChild(sep3);
        addSizeGroup('位置', 'offsetY', offsetY);

        section.appendChild(controls);
        return section;
    }

        private static createContentSection(header: Element, index: number): HTMLElement | null {
        const settings = this.plugin?.settingsManager?.getSettings();
        const headingLevel = settings?.headingLevel || 'h1';
        
        // 获取当前标题到下一个标题之间的所有内容
        let content: Element[] = [];
        let current = header.nextElementSibling;
        
        while (current && current.tagName !== headingLevel.toUpperCase()) {
            content.push(current.cloneNode(true) as Element);
            current = current.nextElementSibling;
        }

        // 检查内容中是否有水平分割线
        const pages: Element[][] = [[]];
        let currentPage = 0;
        
        content.forEach((el: Element) => {
            // 检查是否为水平分割线
            if (el.tagName === 'HR') {
                // 创建新页面
                currentPage++;
                pages[currentPage] = [];
            } else {
                // 如果当前页面数组不存在，创建一个
                if (!pages[currentPage]) {
                    pages[currentPage] = [];
                }
                // 添加元素到当前页面
                pages[currentPage].push(el);
            }
        });
        
        // 如果只有一个页面，按原来的方式处理
        if (pages.length === 1 && !content.some(el => el.tagName === 'HR')) {
            // 创建内容区域
            const section = document.createElement('section');
            section.className = 'red-content-section';
            section.setAttribute('data-index', index.toString());
            
            // 添加标题
            section.appendChild(header.cloneNode(true));
            
            // 添加内容
            content.forEach(el => section.appendChild(el));
            
            // 处理样式和格式
            this.processElements(section);
            
            return section;
        } else {
            // 创建一个包含多个页面的片段
            const fragment = document.createDocumentFragment();
            
            // 为每个页面创建一个部分
            pages.forEach((pageContent, pageIndex) => {
                if (pageContent.length === 0) return; // 跳过空页面
                
                const section = document.createElement('section');
                section.className = 'red-content-section';
                section.setAttribute('data-index', `${index}-${pageIndex}`);
                
                // 每个页面都添加标题
                section.appendChild(header.cloneNode(true));
                
                // 添加页面内容
                pageContent.forEach(el => section.appendChild(el));
                
                // 处理样式和格式
                this.processElements(section);
                
                fragment.appendChild(section);
            });
            
            return fragment as unknown as HTMLElement;
        }
    }

    private static processElements(container: HTMLElement | null): void {
        if (!container) return;

        // 处理强调文本
        container.querySelectorAll('strong, em').forEach(el => {
            el.classList.add('red-emphasis');
        });

        // 处理链接
        container.querySelectorAll('a').forEach(el => {
            el.classList.add('red-link');
        });

        // 处理表格
        container.querySelectorAll('table').forEach(el => {
            if (el === container.closest('table')) return;
            el.classList.add('red-table');
        });

        // 处理分割线
        container.querySelectorAll('hr').forEach(el => {
            el.classList.add('red-hr');
        });

        // 处理删除线
        container.querySelectorAll('del').forEach(el => {
            el.classList.add('red-del');
        });

        // 处理任务列表
        container.querySelectorAll('.task-list-item').forEach(el => {
            el.classList.add('red-task-list-item');
        });

        // 处理脚注
        container.querySelectorAll('.footnote-ref, .footnote-backref').forEach(el => {
            el.classList.add('red-footnote');
        });

        // 处理代码块
        container.querySelectorAll('pre code').forEach(el => {
            const pre = el.parentElement;
            if (pre) {
                pre.classList.add('red-pre');
                
                // 添加 macOS 风格的窗口按钮
                const dots = document.createElement('div');
                dots.className = 'red-code-dots';

                ['red', 'yellow', 'green'].forEach(color => {
                    const dot = document.createElement('span');
                    dot.className = `red-code-dot red-code-dot-${color}`;
                    dots.appendChild(dot);
                });

                pre.insertBefore(dots, pre.firstChild);
                
                // 移除原有的复制按钮
                const copyButton = pre.querySelector('.copy-code-button');
                if (copyButton) {
                    copyButton.remove();
                }
            }
        });

        // 处理图片
        container.querySelectorAll('span.internal-embed[alt][src]').forEach(async el => {
            const originalSpan = el as HTMLElement;
            const src = originalSpan.getAttribute('src');
            const alt = originalSpan.getAttribute('alt');
            
            if (!src) return;
            
            try {
                const linktext = src.split('|')[0];
                const file = this.app.metadataCache.getFirstLinkpathDest(linktext, '');
                if (file) {
                    const absolutePath = this.app.vault.adapter.getResourcePath(file.path);
                    const newImg = document.createElement('img');
                    newImg.src = absolutePath;
                    if (alt) newImg.alt = alt;
                    newImg.className = 'red-image';
                    originalSpan.parentNode?.replaceChild(newImg, originalSpan);
                }
            } catch (error) {
                console.error('图片处理失败:', error);
            }
        });

        // 处理引用块
        container.querySelectorAll('blockquote').forEach(el => {
            el.classList.add('red-blockquote');
            el.querySelectorAll('p').forEach(p => {
                p.classList.add('red-blockquote-p');
            });
        });
    }
}
