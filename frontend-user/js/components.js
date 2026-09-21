/* ========================================
   UI 组件渲染
   ======================================== */

class ComponentRenderer {
    constructor() {
        this.typewriterText = '基于2026年"拉新"战略核心，诊断当前会员体系成熟度，识别关键断层，规划升级路径...';
        this.charIndex = 0;
    }

    // 打字机效果
    startTypewriter() {
        const el = document.getElementById('typewriter');
        if (!el) return;

        const type = () => {
            if (this.charIndex < this.typewriterText.length) {
                el.textContent = this.typewriterText.substring(0, this.charIndex + 1);
                this.charIndex++;
                setTimeout(type, 45);
            }
        };
        type();
    }

    // 渲染统计卡片
    renderStats() {
        const container = document.getElementById('statsGrid');
        if (!container) return;

        container.innerHTML = statsData.map((stat, index) => `
            <div class="glass-card stat-card fade-in delay-${index + 1}" data-index="${index}">
                <span class="stat-icon">${stat.icon}</span>
                <div class="stat-value">${diagnosticMetrics.resolveStatValue(stat)}</div>
                <div class="stat-label">${stat.label}</div>
                ${stat.trend ? `<div class="stat-trend">${stat.trend}</div>` : ''}
            </div>
        `).join('');

        // 添加点击事件
        container.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = card.dataset.index;
                const stat = statsData[index];
                window.toast.info(stat.label, `当前值: ${diagnosticMetrics.resolveStatValue(stat)}`);
            });
        });
    }

    // 渲染矩阵表格
    renderMatrix() {
        const table = document.getElementById('matrixTable');
        if (!table) return;

        let html = '<thead><tr><th>运营维度</th>';
        
        matrixData.phases.forEach(p => {
            html += `
                <th>
                    <div style="font-weight: 700;">${p.name}</div>
                    <div style="font-size: 12px; color: var(--neon-cyan); margin-top: 6px; opacity: 0.9;">
                        焦点: ${p.subtitle}
                    </div>
                </th>
            `;
        });
        html += '</tr></thead><tbody>';

        matrixData.dimensions.forEach((dim, dimIndex) => {
            html += `<tr class="fade-in delay-${Math.min(dimIndex + 1, 5)}" data-dim="${dim.key}" id="matrix-row-${dim.key}">`;
            // 该维度的断层数量来自统一派生结果，概览/侧栏与此处同源
            const dimGapCount = diagnosticMetrics.gapCountByDimension[dim.key] || 0;
            html += `
                <td class="dimension-cell">
                    <span class="dimension-icon">${dim.icon}</span>
                    ${dim.name}
                    <span class="dimension-gap-badge ${dimGapCount > 0 ? 'has-gap' : ''}" data-dim="${dim.key}">
                        ⚠️ 关键断层 × ${dimGapCount}
                    </span>
                </td>
            `;

            matrixData.phases.forEach(phase => {
                const cell = matrixData.cells[dim.key][phase.key];
                let cellClass = '';
                let tag = '';

                if (cell.current) {
                    cellClass = 'cell-current';
                    tag = '<span class="status-tag tag-current">📍 当前位置</span>';
                }
                if (cell.target) {
                    cellClass = 'cell-target';
                    tag = '<span class="status-tag tag-target">🎯 改进目标</span>';
                }

                html += `<td class="${cellClass}" id="matrix-cell-${dim.key}-${phase.key}" data-dim="${dim.key}" data-phase="${phase.key}"><div class="cell-content">${tag}<div class="sop-list">`;
                cell.sop.forEach(s => {
                    html += `<div class="sop-item">${s}</div>`;
                });
                html += '</div>';

                if (cell.tools && (cell.tools.international.length || cell.tools.domestic.length)) {
                    html += '<div class="tools-section"><div class="tools-label">🔧 推荐工具</div>';
                    cell.tools.international.forEach(t => {
                        html += `<span class="tool-tag international" data-tool="${t}" data-dim="${dim.key}" data-phase="${phase.key}" role="button" tabindex="0">${t}</span>`;
                    });
                    cell.tools.domestic.forEach(t => {
                        html += `<span class="tool-tag domestic" data-tool="${t}" data-dim="${dim.key}" data-phase="${phase.key}" role="button" tabindex="0">${t}</span>`;
                    });
                    html += '</div>';
                }
                html += '</div></td>';
            });
            html += '</tr>';
        });

        html += '</tbody>';
        table.innerHTML = html;

        // 工具标签点击：跳转网格视图并高亮其对应的矩阵单元格
        const bindToolTag = (tagEl) => {
            const activate = () => {
                const toolName = tagEl.dataset.tool;
                const dimKey = tagEl.dataset.dim;
                const phaseKey = tagEl.dataset.phase;
                this.focusMatrixCell(dimKey, phaseKey, toolName);
            };
            tagEl.addEventListener('click', activate);
            tagEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate();
                }
            });
        };
        table.querySelectorAll('.tool-tag').forEach(bindToolTag);
    }

    // 定位并高亮矩阵单元格（工具标签 / 侧栏断层卡片共用）
    focusMatrixCell(dimKey, phaseKey, label) {
        // 优先精确命中工具所在单元格；若该格不存在则回退到所在维度行
        const cell = document.getElementById(`matrix-cell-${dimKey}-${phaseKey}`);
        const target = cell || document.getElementById(`matrix-row-${dimKey}`);
        if (!target) {
            window.toast.info('定位失败', '未找到对应的矩阵位置');
            return;
        }

        const matrixSection = document.querySelector('.matrix-section');
        if (matrixSection) {
            matrixSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // 横向滚动容器（移动端窄屏时单元格可能在视口外）
        const wrapper = document.querySelector('.matrix-wrapper');
        if (wrapper && cell) {
            wrapper.scrollTo({
                left: Math.max(0, cell.offsetLeft - wrapper.clientWidth / 2 + cell.clientWidth / 2),
                behavior: 'smooth'
            });
        }

        // 清除上一轮高亮，保证状态与当前定位一致
        this._highlightToken = (this._highlightToken || 0) + 1;
        const token = this._highlightToken;
        document.querySelectorAll('.matrix-cell-highlight').forEach(el => {
            el.classList.remove('matrix-cell-highlight');
        });
        target.classList.add('matrix-cell-highlight');
        setTimeout(() => {
            // 已切换到新目标时，旧定时器不得清除新高亮
            if (this._highlightToken === token) {
                target.classList.remove('matrix-cell-highlight');
            }
        }, 3200);

        const dimName = (matrixData.dimensions.find(d => d.key === dimKey) || {}).name || '';
        if (label) {
            window.toast.info(
                label,
                `${dimName} · 已定位并高亮对应单元格`,
                3000
            );
        }
    }

    // 渲染速赢行动清单
    renderQuickWins() {
        const grid = document.getElementById('quickwinsGrid');
        if (!grid) return;

        // 完成状态只保存在内存中、不做持久化；
        // 重新加载/刷新页面或调用 refresh() 重新渲染时，一律复位为“与数据一致”的未完成态
        this.quickwinDone = new Array(quickWins.length).fill(false);

        grid.innerHTML = quickWins.map((qw, i) => `
            <div class="glass-card quickwin-card fade-in delay-${i + 1}" data-index="${i}">
                <div class="quickwin-number">${i + 1}</div>
                <div class="quickwin-header">
                    <div class="quickwin-icon">${qw.icon}</div>
                    <div>
                        <div class="quickwin-title">${qw.title}</div>
                        <div class="quickwin-timeline">⏱️ ${qw.timeline}</div>
                    </div>
                    <button class="quickwin-check" data-index="${i}" aria-label="标记完成" aria-pressed="false" title="标记完成">
                        <span class="quickwin-check-box">✓</span>
                        <span class="quickwin-check-text">完成</span>
                    </button>
                </div>
                <div class="quickwin-desc">${qw.desc}</div>
                <div class="quickwin-kpi">
                    ${qw.kpis.map(k => `
                        <div class="kpi-item">
                            <div class="kpi-value">${k.value}</div>
                            <div class="kpi-label">${k.label}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // 卡片点击：查看执行周期
        grid.querySelectorAll('.quickwin-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // 点击勾选按钮时不触发卡片提示
                if (e.target.closest('.quickwin-check')) return;
                const index = Number(card.dataset.index);
                const qw = quickWins[index];
                window.toast.success(
                    qw.title,
                    `执行周期: ${qw.timeline}`,
                    4000
                );
            });
        });

        // 勾选完成（状态仅存于内存，重新渲染即复位）
        grid.querySelectorAll('.quickwin-check').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = Number(btn.dataset.index);
                this.quickwinDone[index] = !this.quickwinDone[index];
                const done = this.quickwinDone[index];
                const card = btn.closest('.quickwin-card');
                card.classList.toggle('is-completed', done);
                btn.classList.toggle('is-checked', done);
                btn.setAttribute('aria-pressed', String(done));
                window.toast.info(
                    quickWins[index].title,
                    done ? '已标记为完成' : '已取消完成标记',
                    2000
                );
            });
        });
    }

    // 创建粒子效果
    createParticles() {
        const container = document.querySelector('.particles');
        if (!container) return;

        const colors = ['#a855f7', '#ec4899', '#06b6d4', '#10b981'];
        
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 15}s`;
            particle.style.animationDuration = `${15 + Math.random() * 10}s`;
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.width = `${2 + Math.random() * 4}px`;
            particle.style.height = particle.style.width;
            container.appendChild(particle);
        }
    }

    initSidebar() {
        const sidebar = document.getElementById('diagnosticSidebar');
        const toggle = document.getElementById('sidebarToggle');
        const close = document.getElementById('sidebarClose');
        const body = document.getElementById('sidebarBody');
        if (!sidebar || !toggle || !close || !body) return;

        toggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            toggle.style.opacity = '0';
            toggle.style.pointerEvents = 'none';
        });

        close.addEventListener('click', () => {
            sidebar.classList.remove('open');
            toggle.style.opacity = '1';
            toggle.style.pointerEvents = 'auto';
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                toggle.style.opacity = '1';
                toggle.style.pointerEvents = 'auto';
            }
        });

        this.renderSidebarContent(body);

        body.querySelectorAll('.sidebar-gap-card').forEach(card => {
            card.addEventListener('click', () => {
                sidebar.classList.remove('open');
                toggle.style.opacity = '1';
                toggle.style.pointerEvents = 'auto';

                // 断层 -> 维度映射来自统一派生数据，定位并高亮该维度的目标阶段格子
                const gap = diagnosticMetrics.keyGaps.find(g => String(g.id) === card.dataset.gapId);
                const dimKey = gap && gap.dimensionKeys && gap.dimensionKeys[0];
                if (dimKey) {
                    // 目标阶段(phase2)是各维度断层的改进方向，优先高亮它
                    this.focusMatrixCell(dimKey, 'phase2', gap.title);
                    return;
                }

                // 兜底：无维度映射时滚动到矩阵区域
                const target = document.querySelector('.matrix-section');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        });
    }

    renderSidebarContent(container) {
        const d = diagnosticSummary;
        let html = '';

        html += '<div class="sidebar-section">';
        html += '<div class="sidebar-section-title">📍 当前位置</div>';
        html += `
            <div class="sidebar-position-card is-current">
                <div class="sidebar-position-header">
                    <div class="sidebar-position-label" style="color: ${d.currentPosition.color}">${d.currentPosition.label}</div>
                    <div class="sidebar-position-subtitle">${d.currentPosition.subtitle}</div>
                </div>
                <div class="sidebar-score-bar">
                    <div class="sidebar-score-fill is-red" style="width: ${d.currentPosition.score}%"></div>
                </div>
                <div class="sidebar-position-desc">${d.currentPosition.description}</div>
            </div>
        `;
        html += '</div>';

        html += '<div class="sidebar-section">';
        html += '<div class="sidebar-section-title">🎯 改进目标</div>';
        html += `
            <div class="sidebar-position-card is-target">
                <div class="sidebar-position-header">
                    <div class="sidebar-position-label" style="color: ${d.targetPosition.color}">${d.targetPosition.label}</div>
                    <div class="sidebar-position-subtitle">${d.targetPosition.subtitle}</div>
                </div>
                <div class="sidebar-score-bar">
                    <div class="sidebar-score-fill is-green" style="width: ${d.targetPosition.score}%"></div>
                </div>
                <div class="sidebar-gap-badge">⚠️ ${d.targetPosition.gap}</div>
            </div>
        `;
        html += '</div>';

        html += '<div class="sidebar-section">';
        html += `<div class="sidebar-section-title">🔴 关键断层（${diagnosticMetrics.keyGapTotal}）</div>`;
        diagnosticMetrics.keyGaps.forEach(gap => {
            const sevClass = gap.severity === 'critical' ? 'is-critical' : 'is-high';
            html += `
                <div class="sidebar-gap-card ${sevClass}" data-gap-id="${gap.id}">
                    <div class="sidebar-gap-header">
                        <span class="sidebar-gap-icon">${gap.icon}</span>
                        <span class="sidebar-gap-title">${gap.title}</span>
                        <span class="sidebar-gap-severity ${sevClass}">${gap.severity === 'critical' ? '严重' : '高'}</span>
                    </div>
                    <div class="sidebar-gap-metric">
                        <span class="sidebar-gap-metric-value">${gap.metric}</span>
                        <span class="sidebar-gap-metric-label">${gap.metricLabel}</span>
                    </div>
                    <div class="sidebar-gap-desc">${gap.description}</div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;

        requestAnimationFrame(() => {
            container.querySelectorAll('.sidebar-score-fill').forEach(el => {
                const w = el.style.width;
                el.style.width = '0%';
                requestAnimationFrame(() => { el.style.width = w; });
            });
        });
    }

    // 初始化所有组件
    init() {
        this.createParticles();
        this.startTypewriter();
        this.renderStats();
        this.renderMatrix();
        this.renderQuickWins();
        this.initSidebar();

        // 显示欢迎提示
        setTimeout(() => {
            window.toast.success(
                '欢迎使用诊断驾驶舱',
                '数据已加载完成，点击各模块查看详情',
                5000
            );
        }, 1000);
    }
}

// 创建全局实例
window.componentRenderer = new ComponentRenderer();
