/* ========================================
   UI 组件渲染
   ======================================== */

class ComponentRenderer {
    constructor() {
        this.typewriterText = '基于2026年"拉新"战略核心，诊断当前会员体系成熟度，识别关键断层，规划升级路径...';
        this.charIndex = 0;
        // 速赢完成态的内存工作副本：从数据源头复位，不写入 localStorage
        this.quickWinsState = diagnosticModel.initialQuickWins();
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

        // 统一取 diagnosticModel.resolvedStats，断层数量不再硬编码
        const stats = diagnosticModel.resolvedStats;
        container.innerHTML = stats.map((stat, index) => `
            <div class="glass-card stat-card fade-in delay-${index + 1}" data-index="${index}">
                <span class="stat-icon">${stat.icon}</span>
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
                ${stat.trend ? `<div class="stat-trend">${stat.trend}</div>` : ''}
            </div>
        `).join('');

        // 添加点击事件
        container.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = card.dataset.index;
                const stat = stats[index];
                window.toast.info(stat.label, `当前值: ${stat.value}`);
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
            html += `<tr class="fade-in delay-${Math.min(dimIndex + 1, 5)}" data-dim-row="${dim.key}">`;

            // 维度单元格：断层数量来自 diagnosticModel.gapCountByDimension（与概览、侧栏同源）
            const gapCount = diagnosticModel.gapCountByDimension[dim.key] || 0;
            const gapBadge = gapCount > 0
                ? `<span class="dimension-gap-badge" data-gap-dim="${dim.key}">🔥 ${gapCount} 个断层</span>`
                : '';
            html += `
                <td class="dimension-cell">
                    <span class="dimension-icon">${dim.icon}</span>
                    ${dim.name}
                    ${gapBadge}
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

                // 单元格坐标：工具标签/侧栏断层卡片据此精确定位
                html += `<td class="${cellClass}" data-dim="${dim.key}" data-phase="${phase.key}"><div class="cell-content">${tag}<div class="sop-list">`;
                cell.sop.forEach(s => {
                    html += `<div class="sop-item">${s}</div>`;
                });
                html += '</div>';

                if (cell.tools && (cell.tools.international.length || cell.tools.domestic.length)) {
                    html += '<div class="tools-section"><div class="tools-label">🔧 推荐工具</div>';
                    cell.tools.international.forEach(t => {
                        html += `<span class="tool-tag international" data-tool="${t}" data-dim="${dim.key}" data-phase="${phase.key}">${t}</span>`;
                    });
                    cell.tools.domestic.forEach(t => {
                        html += `<span class="tool-tag domestic" data-tool="${t}" data-dim="${dim.key}" data-phase="${phase.key}">${t}</span>`;
                    });
                    html += '</div>';
                }
                html += '</div></td>';
            });
            html += '</tr>';
        });

        html += '</tbody>';
        table.innerHTML = html;

        // 工具标签点击：跳进网格视图并高亮它所在的单元格
        table.querySelectorAll('.tool-tag').forEach(tagEl => {
            tagEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const { dim, phase, tool } = tagEl.dataset;
                const isInternational = tagEl.classList.contains('international');
                this.focusMatrixCell(dim, phase, { tool });
                window.toast.info(
                    '工具定位',
                    `${tool} - ${isInternational ? '国际工具' : '国内工具'}，已在矩阵中高亮对应格子`,
                    2500
                );
            });
        });
    }

    // 定位并高亮矩阵单元格（工具标签 / 侧栏断层卡片共用）
    focusMatrixCell(dimKey, phaseKey, options = {}) {
        const table = document.getElementById('matrixTable');
        if (!table) return;

        // 优先按精确坐标查找；找不到时退化到该维度的"当前位置"格
        let cell = table.querySelector(`td[data-dim="${dimKey}"][data-phase="${phaseKey}"]`);
        if (!cell && dimKey) {
            cell = table.querySelector(`td[data-dim="${dimKey}"].cell-current`)
                || table.querySelector(`td[data-dim="${dimKey}"]`);
        }
        if (!cell) return;

        // 清理上一次的高亮（工具标签与单元格）
        table.querySelectorAll('.cell-focused').forEach(el => el.classList.remove('cell-focused'));
        table.querySelectorAll('.tool-tag.is-active').forEach(el => el.classList.remove('is-active'));

        cell.classList.add('cell-focused');
        if (typeof cell.scrollIntoView === 'function') {
            cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }

        if (options.tool) {
            const sameTool = cell.querySelectorAll(`.tool-tag[data-tool="${CSS.escape(options.tool)}"]`);
            sameTool.forEach(el => el.classList.add('is-active'));
        }

        // 高亮在动画结束后自动复位，保持状态与数据一致
        clearTimeout(this._focusTimer);
        this._focusTimer = setTimeout(() => {
            cell.classList.remove('cell-focused');
            cell.querySelectorAll('.tool-tag.is-active').forEach(el => el.classList.remove('is-active'));
        }, 2600);
    }

    // 渲染速赢行动清单
    renderQuickWins() {
        const grid = document.getElementById('quickwinsGrid');
        if (!grid) return;

        grid.innerHTML = this.quickWinsState.map((qw, i) => `
            <div class="glass-card quickwin-card fade-in delay-${i + 1}${qw.completed ? ' is-completed' : ''}" data-index="${i}">
                <div class="quickwin-number">${i + 1}</div>
                <div class="quickwin-header">
                    <div class="quickwin-icon">${qw.icon}</div>
                    <div class="quickwin-heading">
                        <div class="quickwin-title">${qw.title}</div>
                        <div class="quickwin-timeline">⏱️ ${qw.timeline}</div>
                    </div>
                    <button class="quickwin-check ${qw.completed ? 'is-done' : ''}"
                            data-index="${i}"
                            role="checkbox"
                            aria-checked="${qw.completed}"
                            aria-label="标记「${qw.title}」为完成"
                            title="${qw.completed ? '取消完成' : '标记完成'}">${qw.completed ? '✓' : ''}</button>
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

        // 勾选按钮：只更新内存状态，不做任何持久化
        grid.querySelectorAll('.quickwin-check').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const i = Number(btn.dataset.index);
                this.toggleQuickWin(i, btn);
            });
        });

        // 卡片点击事件
        grid.querySelectorAll('.quickwin-card').forEach(card => {
            card.addEventListener('click', () => {
                const index = Number(card.dataset.index);
                const qw = this.quickWinsState[index];
                window.toast.success(
                    qw.title,
                    `执行周期: ${qw.timeline}${qw.completed ? ' | ✅ 已完成' : ''}`,
                    4000
                );
            });
        });
    }

    // 切换速赢完成态：状态更新后同步 DOM，保持界面与数据一致
    toggleQuickWin(index, btn) {
        const qw = this.quickWinsState[index];
        if (!qw) return;

        qw.completed = !qw.completed;
        const card = btn.closest('.quickwin-card');
        if (card) card.classList.toggle('is-completed', qw.completed);
        btn.classList.toggle('is-done', qw.completed);
        btn.setAttribute('aria-checked', String(qw.completed));
        btn.textContent = qw.completed ? '✓' : '';
        btn.title = qw.completed ? '取消完成' : '标记完成';

        window.toast.info(
            qw.completed ? '已标记完成' : '已取消完成',
            qw.title,
            2000
        );
    }

    // 重新加载/刷新时调用：从数据源头复位所有勾选
    resetQuickWins() {
        this.quickWinsState = diagnosticModel.initialQuickWins();
        this.renderQuickWins();
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

        // 点击断层卡片：关闭侧栏并在矩阵中定位该断层所属维度的当前位置格
        body.querySelectorAll('.sidebar-gap-card').forEach(card => {
            card.addEventListener('click', () => {
                sidebar.classList.remove('open');
                toggle.style.opacity = '1';
                toggle.style.pointerEvents = 'auto';

                const dimKey = card.dataset.gapDim;
                this.focusMatrixCell(dimKey, null);
            });
        });
    }

    renderSidebarContent(container) {
        const d = diagnosticSummary;
        // 断层列表与计数统一来自 diagnosticModel（与概览卡片、网格视图同源）
        const gaps = diagnosticModel.keyGaps;
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
        // 数量直接读取统一模型，与概览区 "核心断层待解决" 永远一致
        html += `<div class="sidebar-section-title">🔴 关键断层 <span class="sidebar-count-badge">${gaps.length}</span></div>`;
        gaps.forEach(gap => {
            const sevClass = gap.severity === 'critical' ? 'is-critical' : 'is-high';
            html += `
                <div class="sidebar-gap-card ${sevClass}" data-gap-id="${gap.id}" data-gap-dim="${gap.dimension}">
                    <div class="sidebar-gap-header">
                        <span class="sidebar-gap-icon">${gap.icon}</span>
                        <span class="sidebar-gap-title">${gap.title}</span>
                        <span class="sidebar-gap-severity ${sevClass}">${gap.severity === 'critical' ? '严重' : '高'}</span>
                    </div>
                    <div class="sidebar-gap-dim">
                        <span class="sidebar-gap-dim-icon">${gap.dimensionIcon}</span>
                        ${gap.dimensionName}
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
