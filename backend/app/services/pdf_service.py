import os
import logging
import base64
import io
import atexit
import concurrent.futures
from jinja2 import Template
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime, date
from collections import Counter
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

# ── Singleton Playwright browser for fast PDF generation ─────────
_playwright_instance = None
_browser_instance = None


def _get_browser():
    """Return a reusable Chromium browser instance (singleton)."""
    global _playwright_instance, _browser_instance
    if _browser_instance is None:
        _playwright_instance = sync_playwright().start()
        _browser_instance = _playwright_instance.chromium.launch(headless=True)
        logger.info("Playwright browser singleton started")
    return _browser_instance


def _shutdown_browser():
    """Clean up browser on process exit."""
    global _playwright_instance, _browser_instance
    try:
        if _browser_instance:
            _browser_instance.close()
        if _playwright_instance:
            _playwright_instance.stop()
    except Exception:
        pass

atexit.register(_shutdown_browser)


def _generate_timeline_chart(events):
    """Fix #8: Generate a treatment frequency area chart as base64 PNG."""
    if not events:
        return None

    monthly_counts = Counter()
    for ev in events:
        d = getattr(ev, 'date', None)
        if d is None:
            continue
        if isinstance(d, str):
            try:
                d = datetime.strptime(d, "%Y-%m-%d").date()
            except ValueError:
                continue
        key = d.strftime("%Y-%m")
        monthly_counts[key] += 1

    if not monthly_counts:
        return None

    sorted_months = sorted(monthly_counts.keys())
    counts = [monthly_counts[m] for m in sorted_months]
    labels = []
    for m in sorted_months:
        try:
            labels.append(datetime.strptime(m, "%Y-%m").strftime("%b '%y"))
        except ValueError:
            labels.append(m)

    fig, ax = plt.subplots(figsize=(8, 3), dpi=150)
    fig.patch.set_facecolor('#ffffff')
    ax.set_facecolor('#fafbfc')

    ax.fill_between(range(len(labels)), counts, alpha=0.15, color='#3B82F6')
    ax.plot(range(len(labels)), counts, color='#3B82F6', linewidth=2.5, marker='o', markersize=5, markerfacecolor='#1E3A8A', markeredgecolor='white', markeredgewidth=1.5)

    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, fontsize=7, rotation=45, ha='right')
    ax.set_ylabel('Events', fontsize=8, fontweight='bold', color='#64748B')
    ax.tick_params(axis='y', labelsize=7, colors='#64748B')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#e2e8f0')
    ax.spines['bottom'].set_color('#e2e8f0')
    ax.grid(axis='y', alpha=0.3, linestyle='--', color='#e2e8f0')
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def _generate_calendar_chart(events):
    """Fix #8: Generate event type distribution donut chart as base64 PNG."""
    if not events:
        return None

    type_counts = Counter()
    for ev in events:
        et = getattr(ev, 'event_type', None) or 'Other'
        type_counts[et] += 1

    if not type_counts:
        return None

    labels = list(type_counts.keys())[:8]
    sizes = [type_counts[l] for l in labels]
    colors = ['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

    fig, ax = plt.subplots(figsize=(4, 4), dpi=150)
    fig.patch.set_facecolor('#ffffff')

    wedges, texts, autotexts = ax.pie(
        sizes, labels=None, colors=colors[:len(labels)],
        autopct='%1.0f%%', startangle=90, pctdistance=0.78,
        wedgeprops=dict(width=0.35, edgecolor='white', linewidth=2)
    )
    for t in autotexts:
        t.set_fontsize(7)
        t.set_fontweight('bold')
        t.set_color('#475569')

    # Center text
    ax.text(0, 0, str(sum(sizes)), ha='center', va='center', fontsize=20, fontweight='bold', color='#0f172a')
    ax.text(0, -0.15, 'Events', ha='center', va='center', fontsize=7, fontweight='bold', color='#94a3b8')

    # Legend
    ax.legend(labels, loc='center left', bbox_to_anchor=(1, 0.5), fontsize=7, frameon=False)

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def _generate_flag_severity_chart(flags):
    """Fix #8: Generate flag severity distribution chart as base64 PNG."""
    if not flags:
        return None

    severity_counts = Counter()
    for f in flags:
        sev = getattr(f, 'severity', None) or 'Medium'
        severity_counts[sev] += 1

    if not severity_counts:
        return None

    categories = ['High', 'Medium', 'Low']
    counts = [severity_counts.get(c, 0) for c in categories]
    colors_map = {'High': '#EF4444', 'Medium': '#F59E0B', 'Low': '#10B981'}
    colors = [colors_map[c] for c in categories]

    fig, ax = plt.subplots(figsize=(5, 2.5), dpi=150)
    fig.patch.set_facecolor('#ffffff')
    ax.set_facecolor('#fafbfc')

    bars = ax.barh(categories, counts, color=colors, height=0.5, edgecolor='white', linewidth=1)

    for bar, count in zip(bars, counts):
        if count > 0:
            ax.text(bar.get_width() + 0.3, bar.get_y() + bar.get_height() / 2,
                    str(count), va='center', fontsize=9, fontweight='bold', color='#334155')

    ax.set_xlabel('Count', fontsize=8, fontweight='bold', color='#64748B')
    ax.tick_params(axis='both', labelsize=8, colors='#64748B')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#e2e8f0')
    ax.spines['bottom'].set_color('#e2e8f0')
    ax.xaxis.set_major_locator(plt.MaxNLocator(integer=True))

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', facecolor='white', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


# Fix #17: Professional HTML Template with fixed CSS, page breaks, and embedded fonts
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        :root {
            --primary: #1e3a8a;
            --primary-light: #3b82f6;
            --slate-50: #f8fafc;
            --slate-100: #f1f5f9;
            --slate-200: #e2e8f0;
            --slate-400: #94a3b8;
            --slate-500: #64748b;
            --slate-600: #475569;
            --slate-700: #334155;
            --slate-900: #0f172a;
        }
        
        @page {
            size: A4;
            margin: 1.5cm 1.5cm 2cm 1.5cm;
        }

        body {
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            color: var(--slate-900);
            line-height: 1.5;
            font-size: 10pt;
            margin: 0;
            padding: 0;
        }

        /* ── Cover Section ── */
        .cover {
            padding: 40px;
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
            color: white;
            border-radius: 24px;
            margin-bottom: 40px;
        }
        .cover h1 {
            margin: 0;
            font-size: 28pt;
            font-weight: 800;
            letter-spacing: -0.02em;
        }
        .cover p {
            margin: 10px 0 0 0;
            font-size: 11pt;
            color: #93c5fd;
            font-weight: 500;
        }

        /* ── Patient Info ── */
        .case-card {
            background-color: white;
            padding: 25px;
            border-radius: 20px;
            margin-bottom: 30px;
            border: 1px solid var(--slate-200);
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .info-item .label {
            font-weight: 700;
            color: var(--slate-400);
            font-size: 7pt;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            display: block;
            margin-bottom: 4px;
        }
        .info-item .value {
            font-size: 11pt;
            color: var(--slate-900);
            font-weight: 600;
        }

        /* ── KPI Grid ── */
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-bottom: 40px;
        }
        .kpi-card {
            background-color: var(--slate-50);
            padding: 15px;
            border-radius: 16px;
            border: 1px solid var(--slate-100);
            text-align: center;
        }
        .kpi-value {
            font-size: 18pt;
            font-weight: 800;
            color: var(--primary);
            margin: 0;
        }
        .kpi-label {
            font-size: 7pt;
            font-weight: 700;
            color: var(--slate-500);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 2px;
        }

        /* ── ToC ── */
        .toc-container {
            background-color: white;
            padding: 20px;
            border-radius: 16px;
            border: 1px solid var(--slate-100);
        }
        .toc-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px dashed var(--slate-100);
            text-decoration: none;
            color: var(--slate-600);
        }
        .toc-label { font-weight: 600; }
        .toc-dots { flex-grow: 1; border-bottom: 1px dotted var(--slate-200); margin: 0 10px; height: 12px; }

        /* ── Content Sections ── */
        h2 {
            color: var(--primary);
            font-size: 16pt;
            font-weight: 800;
            margin-top: 30px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid var(--slate-100);
            display: flex;
            align-items: center;
            gap: 10px;
            page-break-after: avoid;
        }
        h2::before {
            content: '';
            width: 4px;
            height: 20px;
            background-color: var(--primary-light);
            border-radius: 2px;
            flex-shrink: 0;
        }
        h3 {
            page-break-after: avoid;
        }



        /* ── Tables ── */
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 16px;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--slate-200);
            page-break-inside: auto;
        }
        th {
            background-color: var(--slate-900);
            color: white;
            text-align: left;
            padding: 10px 14px;
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        td {
            padding: 10px 14px;
            border-bottom: 1px solid var(--slate-100);
            font-size: 9pt;
            vertical-align: top;
            background-color: white;
        }
        tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        thead {
            display: table-header-group;
        }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) td { background-color: var(--slate-50); }

        /* ── Badges ── */
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 10px;
            border-radius: 99px;
            font-size: 7.5pt;
            font-weight: 700;
        }
        .badge-blue { background-color: #e0f2fe; color: #0369a1; }
        .badge-red { background-color: #fee2e2; color: #b91c1c; }
        .badge-amber { background-color: #fef3c7; color: #b45309; }
        .badge-green { background-color: #dcfce7; color: #15803d; }

        /* ── Charts ── */
        .chart-container {
            margin: 20px 0;
            text-align: center;
            page-break-inside: avoid;
        }
        .chart-container img {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            border: 1px solid var(--slate-200);
        }

        .page-break { page-break-before: always; }
        .no-data { color: var(--slate-400); font-style: italic; text-align: center; padding: 20px; }

        /* ── Footer ── */
        .report-footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid var(--slate-200);
            text-align: center;
            font-size: 8pt;
            color: var(--slate-400);
        }
    </style>
</head>
<body>
    <!-- ══════════ COVER PAGE ══════════ -->
    <div class="cover">
        <h1>Medical Chronology Report</h1>
        <p>Comprehensive Clinical Intelligence Dashboard</p>
    </div>

    <div class="case-card">
        <div class="info-item">
            <span class="label">Patient Name</span>
            <span class="value">{{ patient.name }}</span>
        </div>
        <div class="info-item">
            <span class="label">Date of Birth</span>
            <span class="value">{{ patient.dob or '--' }}</span>
        </div>
        <div class="info-item">
            <span class="label">Case Reference</span>
            <span class="value">{{ case.case_reference }}</span>
        </div>
        <div class="info-item">
            <span class="label">Report Generated</span>
            <span class="value">{{ current_date }}</span>
        </div>
    </div>

    <div class="kpi-grid">
        <div class="kpi-card"><p class="kpi-value">{{ events|length }}</p><p class="kpi-label">Events</p></div>
        <div class="kpi-card"><p class="kpi-value">{{ diagnostics|length }}</p><p class="kpi-label">Diagnostics</p></div>
        <div class="kpi-card"><p class="kpi-value">{{ treatments|length }}</p><p class="kpi-label">Treatments</p></div>
        <div class="kpi-card"><p class="kpi-value">{{ flags|length }}</p><p class="kpi-label">Flags</p></div>
        <div class="kpi-card"><p class="kpi-value">{{ files|length }}</p><p class="kpi-label">Files</p></div>
    </div>

    <!-- Table of Contents -->
    <div id="toc" class="toc-container">
        <h3 style="margin-top:0; font-size: 12pt; font-weight: 800;">Report Contents</h3>
        {% if flags %}
        <a href="#flags" class="toc-item">
            <span class="toc-label">1. Risk Analysis & Critical Flags</span>
            <span class="toc-dots"></span>
        </a>
        {% endif %}
        <a href="#insights" class="toc-item">
            <span class="toc-label">2. Visual Data Insights</span>
            <span class="toc-dots"></span>
        </a>
        {% if diagnostics %}
        <a href="#diagnostics" class="toc-item">
            <span class="toc-label">3. Diagnostic Highlights</span>
            <span class="toc-dots"></span>
        </a>
        {% endif %}
        {% if treatments %}
        <a href="#treatments" class="toc-item">
            <span class="toc-label">4. Treatment History</span>
            <span class="toc-dots"></span>
        </a>
        {% endif %}
        <a href="#chronology" class="toc-item">
            <span class="toc-label">5. Full Event Chronology</span>
            <span class="toc-dots"></span>
        </a>
        <a href="#files" class="toc-item">
            <span class="toc-label">6. Source Files</span>
            <span class="toc-dots"></span>
        </a>
    </div>

    <div class="page-break"></div>



    <!-- ══════════ CRITICAL FLAGS ══════════ -->
    {% if flags %}
    <div class="page-break"></div>
    <h2 id="flags">Risk Analysis & Critical Flags</h2>
    
    {% if flag_severity_chart %}
    <div class="chart-container">
        <img src="data:image/png;base64,{{ flag_severity_chart }}">
    </div>
    {% endif %}

    <table>
        <thead>
            <tr>
                <th width="15%">Severity</th>
                <th width="20%">Type</th>
                <th width="50%">Description</th>
                <th width="15%">Source</th>
            </tr>
        </thead>
        <tbody>
            {% for flag in flags %}
            <tr>
                <td>
                    {% if flag.severity == 'High' %}
                    <span class="badge badge-red">CRITICAL</span>
                    {% elif flag.severity == 'Medium' %}
                    <span class="badge badge-amber">WARNING</span>
                    {% else %}
                    <span class="badge badge-blue">INFO</span>
                    {% endif %}
                </td>
                <td><strong>{{ flag.type }}</strong></td>
                <td>{{ flag.description }}</td>
                <td style="color: var(--slate-400); font-size: 7pt;">{{ flag.source_file }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
    {% endif %}

    <!-- ══════════ VISUAL INSIGHTS ══════════ -->
    {% if timeline_chart or calendar_chart %}
    <div class="page-break"></div>
    <h2 id="insights">Visual Data Insights</h2>
    
    {% if timeline_chart %}
    <div class="chart-container">
        <h4 style="font-size: 10pt; color: var(--slate-500); margin-bottom: 10px;">Treatment Frequency Over Time</h4>
        <img src="data:image/png;base64,{{ timeline_chart }}">
    </div>
    {% endif %}

    {% if calendar_chart %}
    <div class="chart-container">
        <h4 style="font-size: 10pt; color: var(--slate-500); margin-bottom: 10px;">Clinical Event Distribution</h4>
        <img src="data:image/png;base64,{{ calendar_chart }}">
    </div>
    {% endif %}
    {% endif %}

    <!-- ══════════ DIAGNOSTICS ══════════ -->
    {% if diagnostics %}
    <div class="page-break"></div>
    <h2 id="diagnostics">Diagnostic Highlights</h2>
    <table>
        <thead>
            <tr>
                <th width="12%">Date</th>
                <th width="22%">Test Name</th>
                <th width="33%">Findings</th>
                <th width="33%">Clinical Significance</th>
            </tr>
        </thead>
        <tbody>
            {% for diag in diagnostics %}
            <tr>
                <td>{{ diag.date or 'TBD' }}</td>
                <td><strong>{{ diag.test_name }}</strong></td>
                <td>{{ diag.findings }}</td>
                <td>{{ diag.clinical_significance }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
    {% endif %}

    <!-- ══════════ TREATMENTS ══════════ -->
    {% if treatments %}
    <div class="page-break"></div>
    <h2 id="treatments">Treatment History</h2>
    <table>
        <thead>
            <tr>
                <th width="12%">Date</th>
                <th width="20%">Provider</th>
                <th width="35%">Treatment</th>
                <th width="33%">Notes</th>
            </tr>
        </thead>
        <tbody>
            {% for trt in treatments %}
            <tr>
                <td>{{ trt.date or 'TBD' }}</td>
                <td><span class="badge badge-green">{{ trt.provider or 'Unknown' }}</span></td>
                <td><strong>{{ trt.treatment }}</strong></td>
                <td>{{ trt.notes or '—' }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>
    {% endif %}

    <!-- ══════════ FULL CHRONOLOGY ══════════ -->
    <div class="page-break"></div>
    <h2 id="chronology">Comprehensive Event Chronology</h2>
    <table>
        <thead>
            <tr>
                <th width="12%">Date</th>
                <th width="15%">Type</th>
                <th width="53%">Clinical Details</th>
                <th width="20%">Source</th>
            </tr>
        </thead>
        <tbody>
            {% for event in events %}
            <tr>
                <td>{{ event.date or 'TBD' }}</td>
                <td><span class="badge badge-blue">{{ event.event_type }}</span></td>
                <td>{{ event.description }}</td>
                <td style="color: var(--slate-400); font-size: 7pt;">{{ event.source_file }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <!-- ══════════ SOURCE FILES ══════════ -->
    <div class="page-break"></div>
    <h2 id="files">Source Files</h2>
    <table>
        <thead>
            <tr>
                <th width="50%">File Name</th>
                <th width="20%">Type</th>
                <th width="30%">Processed Date</th>
            </tr>
        </thead>
        <tbody>
            {% for file in files %}
            <tr>
                <td><strong>{{ file.file_name }}</strong></td>
                <td>{{ file.file_type }}</td>
                <td>{{ file.uploaded_at }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div class="report-footer">
        Confidential Medical Summary | Case Ref: {{ case.case_reference }} | Generated by ChronologyAI | {{ current_date }}
    </div>
</body>
</html>
"""

def generate_chronology_pdf(data: dict, output_path: str):
    """Generates a professional PDF using Playwright. Fix #7, #16, #17."""
    data['current_date'] = datetime.now().strftime("%B %d, %Y")
    
    events = data.get('events', [])
    flags = data.get('flags', [])
    
    # ── Parallel chart generation ────────────────────────────────
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        f_timeline = executor.submit(_generate_timeline_chart, events)
        f_calendar = executor.submit(_generate_calendar_chart, events)
        f_flags = executor.submit(_generate_flag_severity_chart, flags)
        
        data['timeline_chart'] = f_timeline.result()
        data['calendar_chart'] = f_calendar.result()
        data['flag_severity_chart'] = f_flags.result()
    

    
    # Render HTML
    template = Template(HTML_TEMPLATE)
    html_content = template.render(**data)
    
    try:
        browser = _get_browser()
        page = browser.new_page()
        
        try:
            page.set_content(html_content, wait_until="domcontentloaded")
            page.wait_for_timeout(300)
            
            page.pdf(
                path=output_path,
                format="A4",
                print_background=True,
                margin={"top": "1.5cm", "right": "1.5cm", "bottom": "2cm", "left": "1.5cm"},
                display_header_footer=True,
                header_template='<div style="width:100%;text-align:center;font-size:8px;color:#94a3b8;font-family:Arial,sans-serif;">Medical Chronology Report — Confidential</div>',
                footer_template='<div style="width:100%;text-align:center;font-size:8px;color:#94a3b8;font-family:Arial,sans-serif;padding:0 20px;"><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
            )
        finally:
            page.close()
            
        logger.info(f"Professional PDF generated via Playwright singleton at {output_path}")
    except Exception as e:
        logger.error(f"Playwright PDF generation failed: {e}")
        # Reset singleton on crash so next call re-creates it
        global _browser_instance, _playwright_instance
        _browser_instance = None
        _playwright_instance = None
        # Fallback to HTML for debugging
        html_path = output_path.replace('.pdf', '.html')
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        logger.info(f"HTML fallback saved at {html_path}")
        raise e

