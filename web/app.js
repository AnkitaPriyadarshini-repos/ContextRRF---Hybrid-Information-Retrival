// ContextRRF Research Dashboard Frontend JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------------------------------------
    // State & Tab Navigation
    // ------------------------------------------------------------------
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            navButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const activePane = document.getElementById(`tab-${targetTab}`);
            if (activePane) activePane.classList.add('active');
        });
    });

    // ------------------------------------------------------------------
    // API Helper Functions
    // ------------------------------------------------------------------
    const API_BASE = window.location.origin;

    async function fetchStats() {
        try {
            const res = await fetch(`${API_BASE}/api/stats`);
            if (!res.ok) return;
            const data = await res.json();
            document.getElementById('stat-files').textContent = data.files_indexed || 0;
            document.getElementById('stat-chunks').textContent = data.chunks_indexed || 0;
            document.getElementById('stat-tokens').textContent = (data.total_tokens || 0).toLocaleString();
            document.getElementById('stat-dbsize').textContent = `${data.database_size_kb || 0} KB`;
        } catch (e) {
            console.error('Failed to fetch stats', e);
        }
    }

    // Initial Stats Load
    fetchStats();

    // ------------------------------------------------------------------
    // Quick Search & Explorer Query Execution
    // ------------------------------------------------------------------
    const quickSearchBtn = document.getElementById('quick-search-btn');
    const quickSearchInput = document.getElementById('quick-search-input');
    const mainSearchBtn = document.getElementById('main-search-btn');
    const mainSearchInput = document.getElementById('main-search-input');

    if (quickSearchBtn && quickSearchInput) {
        quickSearchBtn.addEventListener('click', () => {
            const q = quickSearchInput.value.trim();
            if (!q) return;
            mainSearchInput.value = q;
            // Switch to Search tab
            document.querySelector('[data-tab="search"]').click();
            runSearch(q);
        });
    }

    if (mainSearchBtn && mainSearchInput) {
        mainSearchBtn.addEventListener('click', () => {
            const q = mainSearchInput.value.trim();
            if (q) runSearch(q);
        });
    }

    const budgetRange = document.getElementById('token-budget-range');
    const budgetValue = document.getElementById('budget-value');
    if (budgetRange && budgetValue) {
        budgetRange.addEventListener('input', (e) => {
            budgetValue.textContent = e.target.value;
        });
    }

    async function runSearch(queryText) {
        const resultsContainer = document.getElementById('search-results-container');
        const metaSummary = document.getElementById('query-meta-summary');
        const bm25Comp = document.getElementById('bm25-comparison-list');
        const tfidfComp = document.getElementById('tfidf-comparison-list');
        const rrfComp = document.getElementById('rrf-comparison-list');

        const tokenBudget = parseInt(budgetRange ? budgetRange.value : 8000, 10);
        const useCompression = document.getElementById('compression-toggle') ? document.getElementById('compression-toggle').checked : false;

        resultsContainer.innerHTML = '<div class="placeholder-msg">Executing hybrid query and calculating RRF ranks...</div>';

        try {
            const res = await fetch(`${API_BASE}/api/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: queryText,
                    token_budget: tokenBudget,
                    use_compression: useCompression
                })
            });

            if (!res.ok) {
                resultsContainer.innerHTML = '<div class="placeholder-msg error">Query execution failed.</div>';
                return;
            }

            const data = await res.json();

            // Render Metadata Badge
            metaSummary.textContent = `Latency: ${data.total_latency_ms}ms | Selected Tokens: ${data.tokens_selected}/${data.token_budget} | Results: ${data.results.length}`;

            // Render Side-by-Side Comparisons
            renderMiniList(bm25Comp, data.comparison.bm25_only);
            renderMiniList(tfidfComp, data.comparison.tfidf_only);
            renderMiniList(rrfComp, data.comparison.rrf_hybrid);

            // Render Results Cards with RRF Explanations
            if (!data.results || data.results.length === 0) {
                resultsContainer.innerHTML = '<div class="placeholder-msg">No matching chunks found for query.</div>';
                return;
            }

            resultsContainer.innerHTML = '';
            data.results.forEach(item => {
                const card = document.createElement('div');
                card.className = 'result-card';

                const symbolTag = item.symbol_name ? `<span class="symbol-name">[${item.symbol_name}]</span>` : '';
                const compTag = item.is_compressed ? `<span class="badge" style="background:#ec4899;color:#fff;margin-left:8px;">COMPRESSED</span>` : '';

                card.innerHTML = `
                    <div class="result-card-header">
                        <div>
                            <span class="rank-badge">#${item.final_rank}</span>
                            <span class="file-name">${item.file_path} (L${item.line_start}-L${item.line_end})</span>
                            ${symbolTag}
                            ${compTag}
                        </div>
                        <div class="score-badge">RRF Score: ${item.rrf_score}</div>
                    </div>
                    <div class="result-card-body">
                        <div class="code-block">${escapeHtml(item.content)}</div>

                        <!-- RRF Explanation Panel -->
                        <div class="explanation-panel">
                            <h4>Why This Result Ranked Here</h4>
                            <div class="formula-text">${escapeHtml(item.explanation_formula || '')}</div>

                            <div class="contrib-grid">
                                <div class="contrib-box">
                                    <div class="title">BM25 Channel</div>
                                    <div class="val">Rank: #${item.bm25.rank || 'N/A'} (Score: ${item.bm25.score ? item.bm25.score.toFixed(3) : '0.0'})</div>
                                    <div class="title" style="margin-top:4px;">Contribution: +${item.bm25.contribution ? item.bm25.contribution.toFixed(6) : '0'}</div>
                                </div>
                                <div class="contrib-box">
                                    <div class="title">TF-IDF Channel</div>
                                    <div class="val">Rank: #${item.tfidf.rank || 'N/A'} (Score: ${item.tfidf.score ? item.tfidf.score.toFixed(3) : '0.0'})</div>
                                    <div class="title" style="margin-top:4px;">Contribution: +${item.tfidf.contribution ? item.tfidf.contribution.toFixed(6) : '0'}</div>
                                </div>
                                <div class="contrib-box">
                                    <div class="title">Usage Channel</div>
                                    <div class="val">Rank: #${item.usage.rank || 'N/A'} (Score: ${item.usage.score ? item.usage.score.toFixed(3) : '0.0'})</div>
                                    <div class="title" style="margin-top:4px;">Contribution: +${item.usage.contribution ? item.usage.contribution.toFixed(6) : '0'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                resultsContainer.appendChild(card);
            });

        } catch (e) {
            console.error('Search request failed', e);
            resultsContainer.innerHTML = '<div class="placeholder-msg error">Error executing search. Ensure server is running.</div>';
        }
    }

    function renderMiniList(container, items) {
        if (!container) return;
        if (!items || items.length === 0) {
            container.innerHTML = '<div class="mini-rank-item">No results</div>';
            return;
        }
        container.innerHTML = items.map((item, i) => `
            <div class="mini-rank-item">
                <span class="file">#${i + 1} ${escapeHtml(item.file || '')} ${item.symbol ? '[' + escapeHtml(item.symbol) + ']' : ''}</span>
                <span class="score">${item.score}</span>
            </div>
        `).join('');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // ------------------------------------------------------------------
    // Interactive RRF Playground Logic
    // ------------------------------------------------------------------
    const pgK = document.getElementById('pg-k');
    const pgWBM25 = document.getElementById('pg-w-bm25');
    const pgWTFIDF = document.getElementById('pg-w-tfidf');
    const pgWUsage = document.getElementById('pg-w-usage');

    const pgKVal = document.getElementById('pg-k-val');
    const pgWBM25Val = document.getElementById('pg-w-bm25-val');
    const pgWTFIDFVal = document.getElementById('pg-w-tfidf-val');
    const pgWUsageVal = document.getElementById('pg-w-usage-val');

    const inputsToWatch = [
        pgK, pgWBM25, pgWTFIDF, pgWUsage,
        'rank-a-bm25', 'rank-a-tfidf', 'rank-a-usage',
        'rank-b-bm25', 'rank-b-tfidf', 'rank-b-usage',
        'rank-c-bm25', 'rank-c-tfidf', 'rank-c-usage',
        'rank-d-bm25', 'rank-d-tfidf', 'rank-d-usage',
    ];

    inputsToWatch.forEach(item => {
        const el = typeof item === 'string' ? document.getElementById(item) : item;
        if (el) {
            el.addEventListener('input', updatePlayground);
        }
    });

    async function updatePlayground() {
        if (pgKVal) pgKVal.textContent = pgK.value;
        if (pgWBM25Val) pgWBM25Val.textContent = parseFloat(pgWBM25.value).toFixed(2);
        if (pgWTFIDFVal) pgWTFIDFVal.textContent = parseFloat(pgWTFIDF.value).toFixed(2);
        if (pgWUsageVal) pgWUsageVal.textContent = parseFloat(pgWUsage.value).toFixed(2);

        const bm25_ranks = {
            Doc_A: parseInt(document.getElementById('rank-a-bm25').value || 1, 10),
            Doc_B: parseInt(document.getElementById('rank-b-bm25').value || 2, 10),
            Doc_C: parseInt(document.getElementById('rank-c-bm25').value || 4, 10),
            Doc_D: parseInt(document.getElementById('rank-d-bm25').value || 3, 10),
        };
        const tfidf_ranks = {
            Doc_A: parseInt(document.getElementById('rank-a-tfidf').value || 3, 10),
            Doc_B: parseInt(document.getElementById('rank-b-tfidf').value || 2, 10),
            Doc_C: parseInt(document.getElementById('rank-c-tfidf').value || 1, 10),
            Doc_D: parseInt(document.getElementById('rank-d-tfidf').value || 4, 10),
        };
        const usage_ranks = {
            Doc_A: parseInt(document.getElementById('rank-a-usage').value || 2, 10),
            Doc_B: parseInt(document.getElementById('rank-b-usage').value || 1, 10),
            Doc_C: parseInt(document.getElementById('rank-c-usage').value || 3, 10),
            Doc_D: parseInt(document.getElementById('rank-d-usage').value || 4, 10),
        };

        try {
            const res = await fetch(`${API_BASE}/api/rrf/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    k: parseInt(pgK.value, 10),
                    w_bm25: parseFloat(pgWBM25.value),
                    w_tfidf: parseFloat(pgWTFIDF.value),
                    w_usage: parseFloat(pgWUsage.value),
                    bm25_ranks,
                    tfidf_ranks,
                    usage_ranks,
                })
            });

            if (!res.ok) return;
            const data = await res.json();
            renderPlaygroundResults(data.results);
        } catch (e) {
            console.error('Failed to calculate RRF playground', e);
        }
    }

    function renderPlaygroundResults(results) {
        const container = document.getElementById('playground-results-table');
        if (!container || !results) return;

        let html = `
            <table class="simple-table">
                <thead>
                    <tr>
                        <th>Final Rank</th>
                        <th>Document</th>
                        <th>BM25 Contribution</th>
                        <th>TF-IDF Contribution</th>
                        <th>Usage Contribution</th>
                        <th>Final RRF Score</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(row => {
            html += `
                <tr>
                    <td><span class="rank-badge">#${row.final_rank}</span></td>
                    <td><strong>${escapeHtml(row.doc_name)}</strong></td>
                    <td>+${row.bm25_contribution} (Rank #${row.bm25_rank})</td>
                    <td>+${row.tfidf_contribution} (Rank #${row.tfidf_rank})</td>
                    <td>+${row.usage_contribution} (Rank #${row.usage_rank})</td>
                    <td><strong class="score-badge">${row.total_rrf_score}</strong></td>
                </tr>
                <tr>
                    <td colspan="6" style="padding-top:0; border-bottom:1px solid var(--border-color);">
                        <div class="formula-text">${escapeHtml(row.formula)}</div>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    // Initial Playground Calculation
    updatePlayground();

    // ------------------------------------------------------------------
    // Live Benchmark Suite Execution
    // ------------------------------------------------------------------
    const runBenchmarkBtn = document.getElementById('run-benchmark-btn');
    const benchmarkStatus = document.getElementById('benchmark-status');

    if (runBenchmarkBtn) {
        runBenchmarkBtn.addEventListener('click', async () => {
            benchmarkStatus.textContent = 'Executing live retrieval benchmarks against indexed corpus...';
            benchmarkStatus.style.color = 'var(--accent-blue)';

            try {
                const res = await fetch(`${API_BASE}/api/benchmark`, { method: 'POST' });
                if (!res.ok) {
                    benchmarkStatus.textContent = 'Benchmark execution failed.';
                    return;
                }
                const data = await res.json();

                document.getElementById('bench-bm25-latency').textContent = `${data.avg_bm25_latency_ms} ms`;
                document.getElementById('bench-tfidf-latency').textContent = `${data.avg_tfidf_latency_ms} ms`;
                document.getElementById('bench-rrf-latency').textContent = `${data.avg_rrf_latency_ms} ms`;
                document.getElementById('bench-total-latency').textContent = `${data.avg_total_query_latency_ms} ms`;

                benchmarkStatus.textContent = `Benchmark completed! Executed ${data.queries_executed} test queries across ${data.indexed_chunks} chunks.`;
                benchmarkStatus.style.color = 'var(--accent-green)';

                // Render Experiments Table
                const expTableBody = document.querySelector('#experiments-table tbody');
                if (expTableBody && data.experiments) {
                    expTableBody.innerHTML = data.experiments.map(exp => `
                        <tr class="${exp.name.includes('RRF') ? 'highlight-row' : ''}">
                            <td>${escapeHtml(exp.name.split(':')[0])}</td>
                            <td>${escapeHtml(exp.name.split(':')[1] || exp.name)}</td>
                            <td>${exp.latency_ms} ms</td>
                            <td>${exp.mrr}</td>
                        </tr>
                    `).join('');
                }

            } catch (e) {
                console.error('Benchmark request failed', e);
                benchmarkStatus.textContent = 'Error connecting to server.';
                benchmarkStatus.style.color = 'var(--accent-pink)';
            }
        });
    }
});
