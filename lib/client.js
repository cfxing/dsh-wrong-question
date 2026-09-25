window.__ModuleLoader__.load({
  id: "dsh-wrong-question",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    "use strict";
    var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() { return m[k]; } };
        }
        Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    }));
    var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
        o["default"] = v;
    });
    var __importStar = (this && this.__importStar) || (function () {
        var ownKeys = function(o) {
            ownKeys = Object.getOwnPropertyNames || function (o) {
                var ar = [];
                for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
                return ar;
            };
            return ownKeys(o);
        };
        return function (mod) {
            if (mod && mod.__esModule) return mod;
            var result = {};
            if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
            __setModuleDefault(result, mod);
            return result;
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.inject = void 0;
    exports.registerMainPanel = registerMainPanel;
    exports.apply = apply;
    const jsx_runtime_1 = require("react/jsx-runtime");
    const react_1 = __importStar(require("react"));
    const clientCss = ".dsh-wq-launcher,.dsh-wq-shell,.dsh-wq-overlay{--background-primary:var(--dsw-alias-bg-base,#fff);--background-secondary:var(--dsw-alias-bg-layer-1,#f8f9fb);--background-tertiary:var(--dsw-alias-bg-layer-2,#eef0f4);--text-primary:var(--dsw-alias-label-primary,#1f2328);--text-secondary:var(--dsw-alias-label-secondary,#667085);--border:var(--dsw-alias-border-l3,#d0d5dd);font-family:var(--dsw-font-family,system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif)}\n.dsh-wq-launcher{display:flex;align-items:center;gap:8px;width:100%;border:0;background:transparent;padding:9px 12px;border-radius:9px;color:inherit;cursor:pointer;font:inherit;text-align:left}\n.dsh-wq-launcher:hover{background:var(--background-tertiary)}\n.dsh-wq-icon{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;background:var(--background-tertiary);font-size:12px;font-weight:700}\n.dsh-wq-shell{height:100%;display:flex;flex-direction:column;background:var(--background-primary);color:var(--text-primary)}\n.dsh-wq-header{display:flex;justify-content:space-between;align-items:center;padding:18px 24px;border-bottom:1px solid var(--border)}\n.dsh-wq-header>div:first-child{display:flex;gap:12px;align-items:center}.dsh-wq-header h1{font-size:20px;margin:0}.dsh-wq-header p{margin:3px 0 0;color:var(--text-secondary);font-size:12px}\n.dsh-wq-back{border:0;background:transparent;font-size:25px;color:inherit;cursor:pointer}\n.dsh-wq-header-actions{display:flex;gap:8px}.dsh-wq-header-actions input{width:220px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--background-secondary);color:inherit}\n.dsh-wq-header-actions button,.list-toolbar button,.section-title button{border:1px solid var(--border);background:var(--background-secondary);color:inherit;border-radius:8px;padding:8px 12px;cursor:pointer}\n.dsh-wq-shell .primary{background:#4f46e5;color:#fff;border-color:#4f46e5}.dsh-wq-shell button:disabled{opacity:.55;cursor:wait}\n.dsh-wq-tabs{display:flex;gap:4px;padding:0 24px;border-bottom:1px solid var(--border)}.dsh-wq-tabs button{border:0;background:none;color:var(--text-secondary);padding:11px 14px;cursor:pointer;border-bottom:2px solid transparent}.dsh-wq-tabs button.active{color:var(--text-primary);border-bottom-color:currentColor}\n.dsh-wq-main{flex:1;overflow:auto;padding:24px}.dsh-wq-loading,.empty{padding:50px;text-align:center;color:var(--text-secondary)}\n.dsh-wq-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.metric{border:1px solid var(--border);border-radius:12px;padding:15px;background:var(--background-secondary)}.metric small{display:block;color:var(--text-secondary)}.metric strong{display:block;font-size:25px;margin-top:8px}\n.dashboard-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.dashboard-grid section{border:1px solid var(--border);border-radius:12px;padding:16px;background:var(--background-secondary)}.dashboard-grid .wide{grid-column:1/-1}.dsh-wq-dashboard h2,.graph-page h2{font-size:15px;margin:0 0 14px}.section-title{display:flex;justify-content:space-between;align-items:center}.section-title span{font-size:12px;color:var(--text-secondary)}.section-title button{padding:5px 9px}.weak{display:grid;grid-template-columns:130px 44px 1fr;align-items:center;gap:10px;padding:7px 0}.weak b{text-align:right}.weak i{height:6px;background:var(--background-tertiary);border-radius:5px;overflow:hidden}.weak em{display:block;height:100%;background:#6366f1}\n.activity{height:55px;display:flex;align-items:end;gap:5px}.activity span{width:12px;border-radius:3px;background:currentColor;opacity:.65}\n.mini-bars{height:92px;display:flex;align-items:flex-end;gap:4px}.bar-wrap{height:92px;flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px}.bar-wrap i{display:block;width:100%;min-width:3px;border-radius:4px 4px 1px 1px;background:#6366f1;opacity:.75}.bar-wrap small{font-size:10px;color:var(--text-secondary)}.weekly{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.weekly b{padding:12px 8px;text-align:center;background:var(--background-tertiary);border-radius:8px}.weekly p{grid-column:1/-1;margin:5px 0 0;color:var(--text-secondary)}.cause-list{display:flex;flex-wrap:wrap;gap:8px}.cause-list span{background:var(--background-tertiary);border-radius:999px;padding:7px 10px}.cause-list b{margin-left:8px}\n.list-toolbar{display:flex;justify-content:space-between;margin-bottom:8px}.question-row{width:100%;display:flex;justify-content:space-between;text-align:left;padding:14px;border:1px solid var(--border);border-radius:10px;background:var(--background-secondary);color:inherit;margin:7px 0;cursor:pointer}.question-row strong{font-weight:600}.question-row p{margin:7px 0 0}.question-row p span,.chips span{display:inline-block;padding:3px 7px;margin-right:5px;border-radius:5px;background:var(--background-tertiary);font-size:11px}.question-row small{color:var(--text-secondary)}\n.dsh-wq-overlay{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:1000;display:flex;justify-content:flex-end;color:var(--text-primary);backdrop-filter:blur(1px)}.dsh-wq-sheet{box-sizing:border-box;width:min(650px,94vw);height:100%;background:var(--background-primary);border-left:1px solid var(--border);box-shadow:-12px 0 40px rgba(0,0,0,.22);display:flex;flex-direction:column;isolation:isolate}.dsh-wq-sheet.editor{width:min(760px,96vw)}.dsh-wq-sheet header{flex:none;display:flex;justify-content:space-between;align-items:center;min-height:58px;padding:10px 18px;border-bottom:1px solid var(--border);background:var(--background-primary)}.dsh-wq-sheet header button{border:0;background:none;color:inherit;cursor:pointer;padding:6px 9px;border-radius:6px}.dsh-wq-sheet header>div{display:flex;gap:5px}.dsh-wq-sheet header .danger{color:#dc2626}.sheet-body{flex:1;min-height:0;padding:22px;overflow:auto;background:var(--background-primary)}.sheet-body h2{white-space:pre-wrap;font-size:18px}.sheet-body section{margin-top:22px}.sheet-body pre{white-space:pre-wrap;background:var(--background-secondary);padding:12px;border-radius:8px}.preserve{white-space:pre-wrap;line-height:1.65}.meta{margin:12px 0;color:var(--text-secondary);font-size:12px}.similar{padding:9px 10px;margin:5px 0;border-radius:7px;background:var(--background-secondary)}\n.review-buttons{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:22px}.review-buttons button{display:flex;flex-direction:column;gap:3px;padding:10px;border:1px solid var(--border);background:var(--background-secondary);color:inherit;border-radius:8px;cursor:pointer}.review-buttons small{color:var(--text-secondary)}\n.knowledge-map{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start}.knowledge-map svg{width:100%;min-height:480px;border:1px solid var(--border);border-radius:14px;background:var(--background-secondary)}.graph-lines line{stroke:#f87171;stroke-opacity:.55;stroke-linecap:round}.graph-vertex{cursor:pointer;outline:none}.graph-vertex circle{stroke:rgba(255,255,255,.8);stroke-width:2;filter:drop-shadow(0 3px 5px rgba(15,23,42,.16));transition:opacity .15s,stroke-width .15s}.graph-vertex:hover circle,.graph-vertex:focus circle{stroke:#fff;stroke-width:5;opacity:.88}.graph-vertex text{fill:var(--text-primary);font-size:12px;font-weight:500;paint-order:stroke;stroke:var(--background-secondary);stroke-width:4px;stroke-linejoin:round}.knowledge-map aside{padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--background-secondary)}.knowledge-map aside h3{margin:0 0 12px;font-size:16px}.knowledge-map aside button{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) auto;align-items:center;gap:6px;width:100%;padding:8px 0;border:0;border-bottom:1px solid var(--border);background:transparent;color:inherit;text-align:left;cursor:pointer}.knowledge-map aside button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.knowledge-map aside button i{font-style:normal;color:var(--text-secondary)}.knowledge-map aside button b{padding:3px 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-3,#e8ecf3);color:var(--dsw-alias-brand-primary,#4f46e5);font-size:11px;white-space:nowrap}.knowledge-map aside p{font-size:12px;color:var(--text-secondary)}.graph-stage{position:relative}.graph-stage svg{touch-action:none;user-select:none}.graph-edge text{fill:var(--text-secondary);font-size:10px;font-weight:600;text-anchor:middle;dominant-baseline:middle;fill-opacity:.75;paint-order:stroke;stroke:var(--background-secondary);stroke-width:3px}.graph-controls{position:absolute;right:10px;bottom:10px;display:flex;gap:4px;padding:4px;border-radius:9px;background:var(--background-secondary);box-shadow:0 4px 14px rgba(15,23,42,.18);border:1px solid var(--border)}.graph-controls button{width:26px;height:26px;border:0;border-radius:6px;background:transparent;color:var(--text-primary);cursor:pointer;font-size:16px;line-height:1;display:grid;place-items:center}.graph-controls button:hover{background:var(--background-tertiary)}.graph-zoom{position:absolute;right:10px;top:10px;padding:3px 8px;border-radius:7px;background:var(--background-secondary);border:1px solid var(--border);color:var(--text-secondary);font-size:11px}.kp-focus{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding:9px 12px;border-radius:9px;background:var(--dsw-alias-bg-layer-2,#eef2ff);border:1px solid var(--dsw-alias-border-l2,#c7d2fe)}.kp-focus span{color:var(--text-primary);font-size:13px}.kp-focus b{color:var(--dsw-alias-brand-primary,#4f46e5)}.kp-focus button{border:0;background:transparent;color:var(--dsw-alias-brand-primary,#4f46e5);cursor:pointer;font-size:12px}\n.review-card{max-width:760px;margin:0 auto;border:1px solid var(--border);border-radius:16px;padding:26px;background:var(--background-secondary)}.review-card h2{white-space:pre-wrap;line-height:1.55}.review-progress{font-size:12px;color:var(--text-secondary);margin-bottom:18px}.reveal{display:block;margin:30px auto 5px;padding:10px 24px;border:0;border-radius:9px;background:#4f46e5;color:#fff;cursor:pointer}.review-answer{border-top:1px solid var(--border);margin-top:24px;padding-top:18px}.review-answer pre{white-space:pre-wrap}.review-empty{text-align:center;padding:70px 10px;color:var(--text-secondary)}.review-empty span{display:inline-grid;place-items:center;width:55px;height:55px;border-radius:50%;background:#dcfce7;color:#15803d;font-size:28px}.question-image{display:block;max-width:100%;max-height:380px;margin:0 auto 18px;border-radius:10px;object-fit:contain;background:#fff}.image-badge{display:inline-block;margin-right:7px;padding:2px 5px;border-radius:4px;background:#eef2ff;color:#4338ca;font-size:10px}\n.form{display:flex;flex-direction:column;gap:15px}.form label{display:flex;flex-direction:column;gap:7px;font-size:13px;font-weight:500;color:var(--text-primary)}.form input,.form textarea,.form select{box-sizing:border-box;width:100%;padding:10px 11px;border:1px solid var(--border);border-radius:8px;background:var(--background-secondary);color:var(--text-primary);font:inherit;line-height:1.45;resize:vertical}.form input:focus,.form textarea:focus,.form select:focus{outline:2px solid var(--dsw-alias-brand-primary,#4f46e5);outline-offset:1px}.form textarea{min-height:72px}.form fieldset{display:flex;flex-direction:column;gap:12px;margin:4px 0;padding:14px;border:1px solid var(--border);border-radius:10px}.form legend{padding:0 6px;font-size:13px;font-weight:600}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.image-picker{min-height:100px;display:grid!important;place-items:center;border:1px dashed var(--border);border-radius:10px;padding:12px;background:var(--background-secondary);cursor:pointer}.image-picker input{display:none}.image-picker img{max-width:100%;max-height:240px;object-fit:contain}.text-button{align-self:flex-start;border:0;background:transparent;color:var(--dsw-alias-brand-primary,#4f46e5);cursor:pointer}.agent-tip{border:1px solid var(--dsw-alias-border-l2,#c7d2fe);border-radius:10px;padding:13px 14px;background:var(--dsw-alias-bg-layer-2,#eef2ff);color:var(--text-primary)}.agent-tip p{margin:5px 0 0;color:var(--text-secondary);line-height:1.5}.dsh-wq-error{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;margin-bottom:12px;border-radius:8px;background:var(--dsw-alias-state-error-secondary,#fef2f2);color:var(--dsw-alias-state-error-primary,#b91c1c)}.dsh-wq-error button{border:0;background:none;color:inherit;cursor:pointer}.empty.compact{padding:25px}.graph-page>p{color:var(--text-secondary)}\n.graph-vertex{transition:opacity .15s}.graph-vertex.dim{opacity:.18}.graph-vertex.dim circle{filter:none}.graph-edge{transition:opacity .15s}.graph-edge.dim{opacity:.08}.graph-edge.on line{stroke:#4f46e5;stroke-opacity:.9}.graph-vertex.on circle{stroke:#4f46e5;stroke-width:4;opacity:.95}.graph-vertex.on text{font-weight:700}.graph-stage{cursor:grab}.graph-stage:active{cursor:grabbing}\n.artifact-gallery{margin:0 0 22px!important}.artifact-gallery h3{margin:0 0 12px}.artifact-gallery figure{margin:12px 0}.artifact-gallery figcaption{margin-top:6px;color:var(--text-secondary);font-size:12px}.question-video{display:block;width:100%;max-height:420px;border-radius:10px;background:#000}.question-html{display:block;width:100%;height:420px;border:1px solid var(--border);border-radius:10px;background:#fff}.media-missing{margin-bottom:16px;padding:10px 12px;border-radius:8px;background:var(--background-secondary);color:var(--text-secondary);font-size:12px;overflow-wrap:anywhere}\n@media(max-width:900px){.knowledge-map{grid-template-columns:1fr}.knowledge-map aside{order:-1}.knowledge-map svg{min-height:400px}}\n@media(max-width:720px){.dsh-wq-header{align-items:flex-start;gap:12px;padding:14px;flex-direction:column}.dsh-wq-header-actions{width:100%}.dsh-wq-header-actions input{min-width:0;flex:1}.dsh-wq-tabs{padding:0 10px;overflow:auto}.dsh-wq-main{padding:14px}.dsh-wq-metrics{grid-template-columns:repeat(2,1fr)}.dashboard-grid{grid-template-columns:1fr}.dashboard-grid .wide{grid-column:auto}.form-row{grid-template-columns:1fr}.weak{grid-template-columns:110px 40px 1fr}.review-buttons{grid-template-columns:repeat(2,1fr)}.knowledge-map svg{min-height:330px}.question-html{height:340px}}\n";
    function registerMainPanel(ctx, id, priority, render, onHidden = () => { }) {
        const ui = ctx;
        const layout = ui.layout;
        if (typeof layout.selectPanel !== 'function')
            return ui.slots.register({ name: 'conversation', priority }, render);
        const slots = ui.slots;
        let disposed = false;
        const remove = slots.register({ name: 'main', key: id }, props => react_1.default.createElement(PanelLifecycle, { onHidden }, render(props)));
        try {
            layout.selectPanel(id);
        }
        catch (e) {
            remove();
            throw e;
        }
        return () => { if (disposed)
            return; disposed = true; remove(); };
    }
    function PanelLifecycle({ children, onHidden }) {
        react_1.default.useEffect(() => () => { queueMicrotask(onHidden); }, [onHidden]);
        return children ?? null;
    }
    const PLUGIN_ID = 'dsh-wrong-question';
    const API = '/wrong-question-control/v1';
    exports.inject = ['slots', 'layout'];
    function apply(ctx) {
        installStyles();
        const ui = ctx;
        let dispose;
        const open = () => { dispose?.(); dispose = registerMainPanel(ctx, PLUGIN_ID, -1, () => (0, jsx_runtime_1.jsx)(WrongQuestionWorkspace, { close: () => { dispose?.(); dispose = undefined; } })); };
        ui.slots.inject('sidebar.footer.action', () => ui.slots.register({ name: 'sidebar.footer.action', id: 'wrong-question', order: -9 }, () => ((0, jsx_runtime_1.jsxs)("button", { className: "dsh-wq-launcher", title: "\u9519\u9898\u5E93", onClick: open, children: [(0, jsx_runtime_1.jsx)("span", { className: "dsh-wq-icon", children: "\u9519" }), (0, jsx_runtime_1.jsx)("span", { children: "\u9519\u9898\u5E93" })] }))));
        ctx.effect(() => () => dispose?.(), 'dsh-wrong-question: workspace lifecycle');
    }
    function installStyles() {
        const id = 'dsh-wrong-question';
        if (document.querySelector(`style[data-plugin="${id}"]`))
            return;
        const tag = document.createElement('style');
        tag.dataset.plugin = id;
        tag.textContent = clientCss;
        document.head.appendChild(tag);
    }
    function WrongQuestionWorkspace({ close }) {
        const [tab, setTab] = (0, react_1.useState)('dashboard');
        const [questions, setQuestions] = (0, react_1.useState)([]);
        const [dashboard, setDashboard] = (0, react_1.useState)();
        const [graph, setGraph] = (0, react_1.useState)();
        const [selected, setSelected] = (0, react_1.useState)();
        const [editing, setEditing] = (0, react_1.useState)();
        const [search, setSearch] = (0, react_1.useState)('');
        const [focusPoint, setFocusPoint] = (0, react_1.useState)(null);
        const [loading, setLoading] = (0, react_1.useState)(false);
        const [error, setError] = (0, react_1.useState)('');
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const [d, q, g] = await Promise.all([get('/dashboard'), get('/questions?limit=100'), get('/graph')]);
                setDashboard(d);
                setQuestions(q);
                setGraph(g);
            }
            catch (e) {
                setError(message(e));
            }
            finally {
                setLoading(false);
            }
        };
        (0, react_1.useEffect)(() => { void load(); }, []);
        const filtered = (0, react_1.useMemo)(() => { if (focusPoint) {
            return questions.filter(q => q.knowledgePoints.map(k => k.toLocaleLowerCase()).includes(focusPoint.toLocaleLowerCase()));
        } const s = search.trim().toLocaleLowerCase(); return s ? questions.filter(q => questionText(q).includes(s)) : questions; }, [questions, search, focusPoint]);
        const due = questions.filter(q => new Date(q.review.dueAt) <= new Date());
        const openKnowledgePoint = (name) => { setFocusPoint(name); setTab('questions'); };
        const clearFocus = () => setFocusPoint(null);
        return (0, jsx_runtime_1.jsxs)("div", { className: "dsh-wq-shell", children: [(0, jsx_runtime_1.jsxs)("header", { className: "dsh-wq-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("button", { className: "dsh-wq-back", onClick: close, "aria-label": "\u8FD4\u56DE", children: "\u2039" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { children: "\u9519\u9898\u5E93" }), (0, jsx_runtime_1.jsx)("p", { children: "\u6536\u96C6 \u00B7 \u5206\u6790 \u00B7 \u590D\u4E60 \u00B7 \u638C\u63E1" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dsh-wq-header-actions", children: [(0, jsx_runtime_1.jsx)("input", { value: search, onChange: e => { setSearch(e.target.value); setFocusPoint(null); }, placeholder: "\u641C\u7D22\u9898\u76EE\u3001\u7B54\u6848\u3001\u6807\u7B7E\u3001\u77E5\u8BC6\u70B9\u2026" }), (0, jsx_runtime_1.jsx)("button", { className: "primary", onClick: () => setEditing(null), children: "\uFF0B \u65B0\u5EFA\u9519\u9898" })] })] }), (0, jsx_runtime_1.jsx)("nav", { className: "dsh-wq-tabs", children: [['dashboard', '总览'], ['questions', `错题 ${questions.length}`], ['review', `复习 ${due.length}`], ['graph', '知识图谱']].map(([id, label]) => (0, jsx_runtime_1.jsx)("button", { className: tab === id ? 'active' : '', onClick: () => setTab(id), children: label }, id)) }), (0, jsx_runtime_1.jsxs)("main", { className: "dsh-wq-main", children: [error && (0, jsx_runtime_1.jsxs)("div", { className: "dsh-wq-error", children: [error, (0, jsx_runtime_1.jsx)("button", { onClick: () => void load(), children: "\u91CD\u8BD5" })] }), loading && (0, jsx_runtime_1.jsx)("div", { className: "dsh-wq-loading", children: "\u6B63\u5728\u52A0\u8F7D\u2026" }), !loading && tab === 'dashboard' && (0, jsx_runtime_1.jsx)(DashboardView, { d: dashboard, openTab: setTab }), !loading && tab === 'questions' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [focusPoint && (0, jsx_runtime_1.jsxs)("div", { className: "kp-focus", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["\u805A\u7126\u77E5\u8BC6\u70B9\uFF1A", (0, jsx_runtime_1.jsx)("b", { children: focusPoint })] }), (0, jsx_runtime_1.jsx)("button", { onClick: clearFocus, children: "\u2715 \u6E05\u9664" })] }), (0, jsx_runtime_1.jsx)(QuestionList, { qs: filtered, onSelect: setSelected, onRefresh: load })] }), !loading && tab === 'review' && (0, jsx_runtime_1.jsx)(ReviewView, { qs: due, onReviewed: load }), !loading && tab === 'graph' && (0, jsx_runtime_1.jsx)(GraphView, { g: graph, onPick: openKnowledgePoint })] }), selected && (0, jsx_runtime_1.jsx)(QuestionSheet, { q: selected, close: () => setSelected(undefined), edit: () => { setEditing(selected); setSelected(undefined); }, refresh: async () => { await load(); setSelected(undefined); } }), editing !== undefined && (0, jsx_runtime_1.jsx)(QuestionEditor, { question: editing, close: () => setEditing(undefined), saved: async (q) => { setEditing(undefined); await load(); setSelected(q); } })] });
    }
    function DashboardView({ d, openTab }) {
        if (!d)
            return null;
        return (0, jsx_runtime_1.jsxs)("div", { className: "dsh-wq-dashboard", children: [(0, jsx_runtime_1.jsx)("div", { className: "dsh-wq-metrics", children: [['错题', d.totalQuestions], ['待复习', d.due], ['已复习', d.reviewed], ['已掌握', d.mastered], ['连续学习', d.streak + ' 天']].map(([a, b]) => (0, jsx_runtime_1.jsxs)("div", { className: "metric", children: [(0, jsx_runtime_1.jsx)("small", { children: a }), (0, jsx_runtime_1.jsx)("strong", { children: b })] }, String(a))) }), (0, jsx_runtime_1.jsxs)("div", { className: "dashboard-grid", children: [(0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "section-title", children: [(0, jsx_runtime_1.jsx)("h2", { children: "30 \u5929\u590D\u4E60\u8D8B\u52BF" }), (0, jsx_runtime_1.jsxs)("span", { children: ["\u6B63\u786E\u7387 ", Math.round(d.successRate * 100), "%"] })] }), (0, jsx_runtime_1.jsx)(MiniBars, { data: d.reviewTrend, value: "reviews", title: (x) => `${x.date}：${x.reviews} 次，正确率 ${Math.round(x.successRate * 100)}%` })] }), (0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "section-title", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\u672C\u5468\u62A5\u544A" }), (0, jsx_runtime_1.jsxs)("span", { children: ["\u6D3B\u8DC3 ", d.weeklyReport.activeDays, " \u5929"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "weekly", children: [(0, jsx_runtime_1.jsxs)("b", { children: ["\u65B0\u589E ", d.weeklyReport.added, " \u9053"] }), (0, jsx_runtime_1.jsxs)("b", { children: ["\u590D\u4E60 ", d.weeklyReport.reviews, " \u6B21"] }), (0, jsx_runtime_1.jsxs)("b", { children: ["\u6210\u529F ", d.weeklyReport.successfulReviews, " \u6B21"] }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u8584\u5F31\u77E5\u8BC6\u70B9\uFF1A", d.weeklyReport.weakestKnowledgePoint || '暂无'] })] })] }), (0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "\u8584\u5F31\u77E5\u8BC6\u70B9" }), d.weakPoints.length ? (0, jsx_runtime_1.jsx)("div", { className: "weak-list", children: d.weakPoints.slice(0, 7).map((x) => (0, jsx_runtime_1.jsxs)("div", { className: "weak", children: [(0, jsx_runtime_1.jsx)("span", { children: x.name }), (0, jsx_runtime_1.jsxs)("b", { children: [x.mastery, "%"] }), (0, jsx_runtime_1.jsx)("i", { children: (0, jsx_runtime_1.jsx)("em", { style: { width: `${x.mastery}%` } }) })] }, x.name)) }) : (0, jsx_runtime_1.jsx)("p", { className: "empty compact", children: "\u8FD8\u6CA1\u6709\u77E5\u8BC6\u70B9\u6570\u636E\u3002" })] }), (0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "\u96BE\u5EA6\u5206\u5E03" }), (0, jsx_runtime_1.jsx)(MiniBars, { data: d.difficulty, value: "count", labels: true, title: (x) => `难度 ${x.level}：${x.count} 道` })] }), (0, jsx_runtime_1.jsxs)("section", { className: "wide", children: [(0, jsx_runtime_1.jsxs)("div", { className: "section-title", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\u9519\u8BEF\u7C7B\u578B" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => openTab('questions'), children: "\u67E5\u770B\u9519\u9898" })] }), (0, jsx_runtime_1.jsx)("div", { className: "cause-list", children: d.mistakeCauses.map((x) => (0, jsx_runtime_1.jsxs)("span", { children: [x.name, (0, jsx_runtime_1.jsx)("b", { children: x.count })] }, x.name)) })] })] })] });
    }
    function MiniBars({ data, value, title, labels = false }) {
        const max = Math.max(1, ...data.map(x => Number(x[value]) || 0));
        return (0, jsx_runtime_1.jsx)("div", { className: "mini-bars", children: data.map((x, i) => (0, jsx_runtime_1.jsxs)("div", { className: "bar-wrap", title: title(x), children: [(0, jsx_runtime_1.jsx)("i", { style: { height: `${Math.max(3, (Number(x[value]) || 0) / max * 72)}px` } }), labels && (0, jsx_runtime_1.jsx)("small", { children: x.level })] }, x.date ?? x.level ?? i)) });
    }
    function QuestionList({ qs, onSelect, onRefresh }) {
        return (0, jsx_runtime_1.jsxs)("div", { className: "dsh-wq-list", children: [(0, jsx_runtime_1.jsxs)("div", { className: "list-toolbar", children: [(0, jsx_runtime_1.jsxs)("span", { children: [qs.length, " \u9053"] }), (0, jsx_runtime_1.jsx)("button", { onClick: onRefresh, children: "\u5237\u65B0" })] }), qs.map(q => (0, jsx_runtime_1.jsxs)("button", { className: "question-row", onClick: () => onSelect(q), children: [(0, jsx_runtime_1.jsxs)("div", { children: [q.imageData && (0, jsx_runtime_1.jsx)("span", { className: "image-badge", children: "\u56FE\u7247" }), (0, jsx_runtime_1.jsx)("strong", { children: q.content.slice(0, 120) }), (0, jsx_runtime_1.jsxs)("p", { children: [q.knowledgePoints.map(x => (0, jsx_runtime_1.jsx)("span", { children: x }, x)), q.tags.map(x => (0, jsx_runtime_1.jsxs)("span", { children: ["#", x] }, x))] })] }), (0, jsx_runtime_1.jsx)("small", { children: isDue(q) ? '待复习' : q.review.reps ? '复习中' : '待学习' })] }, q.id)), !qs.length && (0, jsx_runtime_1.jsx)("div", { className: "empty", children: "\u6CA1\u6709\u5339\u914D\u7684\u9519\u9898\u3002" })] });
    }
    function ReviewView({ qs, onReviewed }) {
        const [index, setIndex] = (0, react_1.useState)(0), [revealed, setRevealed] = (0, react_1.useState)(false), [busy, setBusy] = (0, react_1.useState)(false);
        (0, react_1.useEffect)(() => { setIndex(0); setRevealed(false); }, [qs.length]);
        const q = qs[index];
        if (!q)
            return (0, jsx_runtime_1.jsxs)("div", { className: "review-empty", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u2713" }), (0, jsx_runtime_1.jsx)("h2", { children: "\u4ECA\u5929\u7684\u590D\u4E60\u5B8C\u6210\u4E86" }), (0, jsx_runtime_1.jsx)("p", { children: "\u65B0\u7684\u5230\u671F\u9519\u9898\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u8FD9\u91CC\u3002" })] });
        const grade = async (g) => { setBusy(true); try {
            await post(`/questions/${q.id}/review`, { grade: g });
            await onReviewed();
            setRevealed(false);
            setIndex(i => Math.min(i, Math.max(0, qs.length - 2)));
        }
        finally {
            setBusy(false);
        } };
        const image = questionImage(q);
        return (0, jsx_runtime_1.jsxs)("div", { className: "review-card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "review-progress", children: ["\u7B2C ", index + 1, " / ", qs.length, " \u9898"] }), image && (0, jsx_runtime_1.jsx)("img", { className: "question-image", src: image, alt: "\u9519\u9898\u56FE\u7247" }), (0, jsx_runtime_1.jsx)("h2", { children: q.content }), (0, jsx_runtime_1.jsx)("div", { className: "chips", children: q.knowledgePoints.map(x => (0, jsx_runtime_1.jsx)("span", { children: x }, x)) }), !revealed ? (0, jsx_runtime_1.jsx)("button", { className: "reveal", onClick: () => setRevealed(true), children: "\u663E\u793A\u7B54\u6848" }) : (0, jsx_runtime_1.jsxs)("div", { className: "review-answer", children: [(0, jsx_runtime_1.jsx)("h3", { children: "\u6B63\u786E\u7B54\u6848" }), (0, jsx_runtime_1.jsx)("pre", { children: q.answer || '尚未填写' }), q.analysis && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h3", { children: "\u89E3\u6790" }), (0, jsx_runtime_1.jsx)("p", { children: q.analysis })] }), (0, jsx_runtime_1.jsx)("div", { className: "review-buttons", children: ['again', 'hard', 'good', 'easy'].map(g => (0, jsx_runtime_1.jsxs)("button", { disabled: busy, onClick: () => void grade(g), children: [(0, jsx_runtime_1.jsx)("b", { children: labelGrade(g) }), (0, jsx_runtime_1.jsx)("small", { children: nextHint(q, g) })] }, g)) })] })] });
    }
    function QuestionSheet({ q, close, edit, refresh }) {
        const [similar, setSimilar] = (0, react_1.useState)([]), [error, setError] = (0, react_1.useState)('');
        (0, react_1.useEffect)(() => { post('/similar', { questionId: q.id, limit: 5 }).then((xs) => setSimilar(xs.map(x => x.question))).catch(() => setSimilar([])); }, [q.id]);
        const del = async () => { if (window.confirm('确定删除这道错题及其复习记录吗？')) {
            try {
                await request(`/questions/${q.id}`, 'DELETE');
                await refresh();
            }
            catch (e) {
                setError(message(e));
            }
        } };
        return (0, jsx_runtime_1.jsx)("div", { className: "dsh-wq-overlay", onMouseDown: e => { if (e.target === e.currentTarget)
                close(); }, children: (0, jsx_runtime_1.jsxs)("article", { className: "dsh-wq-sheet", children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsx)("button", { onClick: close, children: "\u00D7" }), (0, jsx_runtime_1.jsx)("span", { children: "\u9519\u9898\u8BE6\u60C5" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("button", { onClick: edit, children: "\u7F16\u8F91" }), (0, jsx_runtime_1.jsx)("button", { className: "danger", onClick: () => void del(), children: "\u5220\u9664" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "sheet-body", children: [error && (0, jsx_runtime_1.jsx)("div", { className: "dsh-wq-error", children: error }), (0, jsx_runtime_1.jsx)(MediaGallery, { q: q }), (0, jsx_runtime_1.jsx)("h2", { children: q.content }), (0, jsx_runtime_1.jsxs)("div", { className: "chips", children: [q.knowledgePoints.map(x => (0, jsx_runtime_1.jsx)("span", { children: x }, x)), q.tags.map(x => (0, jsx_runtime_1.jsxs)("span", { children: ["#", x] }, x))] }), (0, jsx_runtime_1.jsxs)("div", { className: "meta", children: ["\u96BE\u5EA6 ", '★'.repeat(q.difficulty), '☆'.repeat(5 - q.difficulty), " \u00B7 \u590D\u4E60 ", q.review.reps, " \u6B21 \u00B7 \u95F4\u9694 ", q.review.intervalDays, " \u5929"] }), (0, jsx_runtime_1.jsx)(Detail, { title: "\u6B63\u786E\u7B54\u6848", value: q.answer }), (0, jsx_runtime_1.jsx)(Detail, { title: "\u89E3\u6790", value: q.analysis }), (0, jsx_runtime_1.jsx)(Detail, { title: "\u9519\u8BEF\u539F\u56E0", value: q.mistakeCause }), (0, jsx_runtime_1.jsx)(Detail, { title: "\u4E3E\u4E00\u53CD\u4E09", value: q.followupQuestion }), (0, jsx_runtime_1.jsx)(Detail, { title: "OCR \u6587\u672C", value: q.ocrText }), !!similar.length && (0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h3", { children: "\u76F8\u4F3C\u9519\u9898" }), similar.map(x => (0, jsx_runtime_1.jsx)("div", { className: "similar", children: x.content.slice(0, 90) }, x.id))] })] })] }) });
    }
    function Detail({ title, value }) { return value ? (0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h3", { children: title }), (0, jsx_runtime_1.jsx)("p", { className: "preserve", children: value })] }) : null; }
    function MediaGallery({ q }) {
        const primary = questionImage(q);
        const artifacts = q.artifacts ?? [];
        if (!primary && !artifacts.length)
            return q.imagePath ? (0, jsx_runtime_1.jsxs)("div", { className: "media-missing", children: ["\u539F\u9898\u56FE\u7247\u8DEF\u5F84\u65E0\u6CD5\u5728\u6D4F\u89C8\u5668\u4E2D\u8BBF\u95EE\uFF1A", q.imagePath] }) : null;
        return (0, jsx_runtime_1.jsxs)("section", { className: "artifact-gallery", children: [(0, jsx_runtime_1.jsx)("h3", { children: "\u539F\u9898\u4E0E\u4E92\u52A8\u5185\u5BB9" }), primary && (0, jsx_runtime_1.jsx)("img", { className: "question-image", src: primary, alt: "\u539F\u9898\u56FE\u7247" }), artifacts.map((a, i) => {
                    const title = a.title || `${a.kind} ${i + 1}`;
                    if (a.kind === 'image') {
                        const src = mediaUrl(a.source, 'image');
                        return src ? (0, jsx_runtime_1.jsxs)("figure", { children: [(0, jsx_runtime_1.jsx)("img", { className: "question-image", src: src, alt: title }), (0, jsx_runtime_1.jsx)("figcaption", { children: title })] }, i) : null;
                    }
                    if (a.kind === 'video') {
                        const src = mediaUrl(a.source, 'video');
                        return src ? (0, jsx_runtime_1.jsxs)("figure", { children: [(0, jsx_runtime_1.jsx)("video", { className: "question-video", src: src, poster: mediaUrl(a.poster, 'image'), controls: true, preload: "metadata" }), (0, jsx_runtime_1.jsx)("figcaption", { children: title })] }, i) : null;
                    }
                    if (a.kind === 'html' && a.content)
                        return (0, jsx_runtime_1.jsxs)("figure", { children: [(0, jsx_runtime_1.jsx)("iframe", { className: "question-html", title: title, srcDoc: a.content, sandbox: "allow-scripts" }), (0, jsx_runtime_1.jsx)("figcaption", { children: title })] }, i);
                    const src = mediaUrl(a.source, 'html');
                    return src ? (0, jsx_runtime_1.jsxs)("figure", { children: [(0, jsx_runtime_1.jsx)("iframe", { className: "question-html", title: title, src: src, sandbox: "allow-scripts" }), (0, jsx_runtime_1.jsx)("figcaption", { children: title })] }, i) : null;
                })] });
    }
    function QuestionEditor({ question, close, saved }) {
        const [form, setForm] = (0, react_1.useState)(() => ({ content: question?.content ?? '', answer: question?.answer ?? '', analysis: question?.analysis ?? '', mistakeCause: question?.mistakeCause ?? '', followupQuestion: question?.followupQuestion ?? '', ocrText: question?.ocrText ?? '', source: question?.source ?? '', knowledgePoints: (question?.knowledgePoints ?? []).join('，'), tags: (question?.tags ?? []).join('，'), difficulty: question?.difficulty ?? 3, imageData: question?.imageData ?? '', mediaKind: (question?.artifacts ?? []).find(x => x.kind !== 'html')?.kind ?? 'image', mediaUrl: (question?.artifacts ?? []).find(x => x.kind !== 'html')?.source ?? '', htmlTitle: (question?.artifacts ?? []).find(x => x.kind === 'html')?.title ?? '', htmlContent: (question?.artifacts ?? []).find(x => x.kind === 'html')?.content ?? '' }));
        const [busy, setBusy] = (0, react_1.useState)(false), [error, setError] = (0, react_1.useState)('');
        const set = (key, value) => setForm(x => ({ ...x, [key]: value }));
        const chooseImage = async (e) => { const file = e.target.files?.[0]; if (!file)
            return; if (file.size > 5_000_000) {
            setError('图片不能超过 5 MB');
            return;
        } set('imageData', await readImage(file)); if (!form.content)
            set('content', file.name.replace(/\.[^.]+$/, '')); };
        const save = async () => { if (!form.content.trim()) {
            setError('请填写题目内容');
            return;
        } setBusy(true); setError(''); try {
            const artifacts = [];
            if (form.mediaUrl.trim())
                artifacts.push({ kind: form.mediaKind, title: '相关媒体', source: form.mediaUrl.trim() });
            if (form.htmlContent.trim())
                artifacts.push({ kind: 'html', title: form.htmlTitle.trim() || '互动卡片', content: form.htmlContent });
            const payload = { ...form, content: form.content.trim(), knowledgePoints: splitList(form.knowledgePoints), tags: splitList(form.tags), difficulty: Number(form.difficulty), artifacts };
            const q = await request(question ? `/questions/${question.id}` : '/questions', question ? 'PATCH' : 'POST', payload);
            await saved(q);
        }
        catch (e) {
            setError(message(e));
        }
        finally {
            setBusy(false);
        } };
        return (0, jsx_runtime_1.jsx)("div", { className: "dsh-wq-overlay", children: (0, jsx_runtime_1.jsxs)("article", { className: "dsh-wq-sheet editor", children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsx)("button", { onClick: close, children: "\u00D7" }), (0, jsx_runtime_1.jsx)("span", { children: question ? '编辑错题' : '新建错题' }), (0, jsx_runtime_1.jsx)("button", { className: "primary", disabled: busy, onClick: () => void save(), children: busy ? '保存中…' : '保存' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "sheet-body form", children: [error && (0, jsx_runtime_1.jsx)("div", { className: "dsh-wq-error", children: error }), (0, jsx_runtime_1.jsxs)("label", { className: "image-picker", children: [form.imageData ? (0, jsx_runtime_1.jsx)("img", { src: form.imageData, alt: "\u5F85\u5BFC\u5165\u9519\u9898" }) : (0, jsx_runtime_1.jsx)("span", { children: "\uD83D\uDDBC\uFE0F \u9009\u62E9\u9519\u9898\u56FE\u7247\uFF08\u53EF\u9009\uFF09" }), (0, jsx_runtime_1.jsx)("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", onChange: e => void chooseImage(e) })] }), form.imageData && (0, jsx_runtime_1.jsx)("button", { className: "text-button", onClick: () => set('imageData', ''), children: "\u79FB\u9664\u56FE\u7247" }), (0, jsx_runtime_1.jsx)(Field, { label: "\u9898\u76EE", value: form.content, set: v => set('content', v), rows: 5 }), (0, jsx_runtime_1.jsxs)("div", { className: "form-row", children: [(0, jsx_runtime_1.jsx)(Field, { label: "\u77E5\u8BC6\u70B9\uFF08\u9017\u53F7\u5206\u9694\uFF09", value: form.knowledgePoints, set: v => set('knowledgePoints', v) }), (0, jsx_runtime_1.jsx)(Field, { label: "\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF09", value: form.tags, set: v => set('tags', v) })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["\u96BE\u5EA6", (0, jsx_runtime_1.jsx)("select", { value: form.difficulty, onChange: e => set('difficulty', e.target.value), children: [1, 2, 3, 4, 5].map(x => (0, jsx_runtime_1.jsxs)("option", { value: x, children: [x, " \u661F"] }, x)) })] }), (0, jsx_runtime_1.jsx)(Field, { label: "\u6B63\u786E\u7B54\u6848", value: form.answer, set: v => set('answer', v), rows: 4 }), (0, jsx_runtime_1.jsx)(Field, { label: "\u89E3\u6790", value: form.analysis, set: v => set('analysis', v), rows: 5 }), (0, jsx_runtime_1.jsx)(Field, { label: "\u9519\u8BEF\u539F\u56E0", value: form.mistakeCause, set: v => set('mistakeCause', v), rows: 3 }), (0, jsx_runtime_1.jsx)(Field, { label: "\u4E3E\u4E00\u53CD\u4E09", value: form.followupQuestion, set: v => set('followupQuestion', v), rows: 3 }), (0, jsx_runtime_1.jsx)(Field, { label: "OCR \u6587\u672C", value: form.ocrText, set: v => set('ocrText', v), rows: 3 }), (0, jsx_runtime_1.jsx)(Field, { label: "\u6765\u6E90", value: form.source, set: v => set('source', v) }), (0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: "\u5A92\u4F53\u4E0E\u4E92\u52A8\u5185\u5BB9" }), (0, jsx_runtime_1.jsxs)("div", { className: "form-row", children: [(0, jsx_runtime_1.jsxs)("label", { children: ["\u5A92\u4F53\u7C7B\u578B", (0, jsx_runtime_1.jsxs)("select", { value: form.mediaKind, onChange: e => set('mediaKind', e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "image", children: "\u56FE\u7247" }), (0, jsx_runtime_1.jsx)("option", { value: "video", children: "\u89C6\u9891" })] })] }), (0, jsx_runtime_1.jsx)(Field, { label: "\u5A92\u4F53 URL", value: form.mediaUrl, set: v => set('mediaUrl', v) })] }), (0, jsx_runtime_1.jsx)(Field, { label: "\u4E92\u52A8\u5361\u7247\u6807\u9898", value: form.htmlTitle, set: v => set('htmlTitle', v) }), (0, jsx_runtime_1.jsx)(Field, { label: "\u4E92\u52A8\u5361\u7247 HTML", value: form.htmlContent, set: v => set('htmlContent', v), rows: 6 })] }), (0, jsx_runtime_1.jsxs)("aside", { className: "agent-tip", children: [(0, jsx_runtime_1.jsx)("b", { children: "\u7528 Harness AI \u81EA\u52A8\u586B\u5199" }), (0, jsx_runtime_1.jsx)("p", { children: "\u5728\u5BF9\u8BDD\u4E2D\u4E0A\u4F20\u9898\u56FE\u5E76\u8BF4\u201C\u5206\u6790\u540E\u52A0\u5165\u9519\u9898\u5E93\u201D\u3002Harness Vision \u5B8C\u6210\u8BC6\u522B\u540E\u4F1A\u8C03\u7528 add_question\uFF1B\u5BF9\u5DF2\u6709\u8BB0\u5F55\u4F1A\u8C03\u7528 analyze_question\u3002" })] })] })] }) });
    }
    function Field({ label, value, set, rows = 1 }) { return (0, jsx_runtime_1.jsxs)("label", { children: [label, rows > 1 ? (0, jsx_runtime_1.jsx)("textarea", { rows: rows, value: value, onChange: e => set(e.target.value) }) : (0, jsx_runtime_1.jsx)("input", { value: value, onChange: e => set(e.target.value) })] }); }
    function GraphView({ g, onPick }) {
        const [vp, setVp] = (0, react_1.useState)({ scale: 1, tx: 0, ty: 0 });
        const svgRef = react_1.default.useRef(null);
        const dragRef = react_1.default.useRef({ x: 0, y: 0, on: false });
        if (!g)
            return null;
        const layout = layoutGraph(g);
        const [pos, setPos] = (0, react_1.useState)({});
        const [hover, setHover] = (0, react_1.useState)(null);
        const nodeDragRef = react_1.default.useRef(null);
        const movedRef = react_1.default.useRef(false);
        const pairs = [...g.edges].sort((a, b) => b.weight - a.weight).slice(0, 8);
        const at = (n) => pos[n.id] || { x: n.x, y: n.y };
        const reset = () => { setPos({}); setVp({ scale: 1, tx: 0, ty: 0 }); };
        const zoomAt = (px, py, factor) => {
            setVp(v => {
                const scale = Math.min(4, Math.max(0.4, v.scale * factor));
                const k = scale / v.scale;
                return { scale, tx: px - (px - v.tx) * k, ty: py - (py - v.ty) * k };
            });
        };
        const onWheel = (e) => {
            if (!svgRef.current)
                return;
            const rect = svgRef.current.getBoundingClientRect();
            zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
        };
        const onDown = (e) => {
            if (nodeDragRef.current)
                return;
            dragRef.current = { x: e.clientX, y: e.clientY, on: true };
            svgRef.current?.setPointerCapture(e.pointerId);
        };
        const onMove = (e) => {
            const nd = nodeDragRef.current;
            if (nd) { // 拖动节点：换算到世界坐标
                const rect = svgRef.current?.getBoundingClientRect();
                if (!rect)
                    return;
                movedRef.current = true;
                const wx = (e.clientX - rect.left - vp.tx) / vp.scale, wy = (e.clientY - rect.top - vp.ty) / vp.scale;
                setPos(p => ({ ...p, [nd]: { x: wx, y: wy } }));
                return;
            }
            if (!dragRef.current.on)
                return;
            setVp(v => ({ ...v, tx: v.tx + e.clientX - dragRef.current.x, ty: v.ty + e.clientY - dragRef.current.y }));
            dragRef.current = { x: e.clientX, y: e.clientY, on: true };
        };
        const onUp = () => {
            const wasNode = !!nodeDragRef.current;
            dragRef.current.on = false;
            nodeDragRef.current = null;
            setHover(null);
            if (!wasNode)
                movedRef.current = false; // 平移重置; 节点拖拽保留给 onClick 判断
        };
        const nodeDown = (e, n) => {
            e.stopPropagation();
            e.preventDefault();
            movedRef.current = false;
            nodeDragRef.current = n.id;
            setPos(p => ({ ...p, [n.id]: { ...at(n) } }));
        };
        const dim = (n, nab) => !!hover && hover !== n.id && !nab.has(n.id);
        return (0, jsx_runtime_1.jsxs)("div", { className: "graph-page", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\u77E5\u8BC6\u56FE\u8C31" }), (0, jsx_runtime_1.jsx)("p", { children: "\u8282\u70B9\u5927\u5C0F\u4EE3\u8868\u9519\u9898\u6570\u91CF\uFF0C\u8FDE\u7EBF\u7C97\u7EC6\u4EE3\u8868\u5171\u540C\u51FA\u73B0\u7684\u9891\u7387\u3002\u53EF\u62D6\u62FD\u8282\u70B9\u3001\u6EDA\u8F6E\u7F29\u653E\uFF0C\u70B9\u51FB\u8282\u70B9\u67E5\u770B\u9519\u9898\uFF0C\u60AC\u505C\u9AD8\u4EAE\u5173\u8054\u3002" }), layout.nodes.length ? (0, jsx_runtime_1.jsxs)("div", { className: "knowledge-map", children: [(0, jsx_runtime_1.jsxs)("div", { className: "graph-stage", children: [(0, jsx_runtime_1.jsx)("svg", { ref: svgRef, viewBox: "0 0 720 480", role: "img", "aria-label": "\u77E5\u8BC6\u70B9\u5173\u7CFB\u56FE", onWheel: onWheel, onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp, style: { cursor: nodeDragRef.current ? 'move' : dragRef.current.on ? 'grabbing' : 'grab' }, children: (0, jsx_runtime_1.jsxs)("g", { transform: `translate(${vp.tx} ${vp.ty}) scale(${vp.scale})`, children: [(0, jsx_runtime_1.jsx)("g", { className: "graph-lines", children: layout.edges.map((e) => {
                                                    const s = at(e.source), t = at(e.target), on = !hover || hover === e.source.id || hover === e.target.id;
                                                    return (0, jsx_runtime_1.jsxs)("g", { className: `graph-edge${on ? '' : ' dim'}`, children: [(0, jsx_runtime_1.jsx)("line", { x1: s.x, y1: s.y, x2: t.x, y2: t.y, strokeWidth: Math.min(7, 1 + e.weight) }), (0, jsx_runtime_1.jsxs)("text", { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2, children: [e.weight, "\u6B21"] })] }, e.source.id + '-' + e.target.id);
                                                }) }), (0, jsx_runtime_1.jsx)("g", { children: layout.nodes.map((n) => {
                                                    const p = at(n), nabors = new Set(layout.edges.filter((e) => e.source.id === n.id || e.target.id === n.id).flatMap((e) => [e.source.id, e.target.id]));
                                                    return (0, jsx_runtime_1.jsxs)("g", { className: `graph-vertex${hover === n.id ? ' on' : ''}${dim(n, nabors) ? ' dim' : ''}`, role: "button", tabIndex: 0, onPointerDown: e => nodeDown(e, n), onClick: ev => { ev.stopPropagation(); if (movedRef.current)
                                                            movedRef.current = false;
                                                        else
                                                            onPick(n.id); }, onPointerEnter: () => setHover(n.id), onPointerLeave: () => setHover(null), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ')
                                                            onPick(n.id); }, children: [(0, jsx_runtime_1.jsx)("circle", { cx: p.x, cy: p.y, r: n.r, fill: n.color }), (0, jsx_runtime_1.jsxs)("text", { x: p.x, y: p.y + n.r + 16, textAnchor: "middle", children: [n.id, " (", n.count, ")"] }), (0, jsx_runtime_1.jsxs)("title", { children: [n.id, "\uFF1A", n.count, " \u9053\uFF0C\u638C\u63E1 ", n.mastery, "%\uFF0C\u5F85\u590D\u4E60 ", n.due] })] }, n.id);
                                                }) })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "graph-controls", children: [(0, jsx_runtime_1.jsx)("button", { onClick: (e) => { const r = svgRef.current?.getBoundingClientRect(); zoomAt((r?.width || 720) / 2, (r?.height || 480) / 2, 1.2); }, "aria-label": "\u653E\u5927", children: "\uFF0B" }), (0, jsx_runtime_1.jsx)("button", { onClick: (e) => { const r = svgRef.current?.getBoundingClientRect(); zoomAt((r?.width || 720) / 2, (r?.height || 480) / 2, 1 / 1.2); }, "aria-label": "\u7F29\u5C0F", children: "\uFF0D" }), (0, jsx_runtime_1.jsx)("button", { onClick: reset, "aria-label": "\u91CD\u7F6E", children: "\u27F2" })] }), (0, jsx_runtime_1.jsxs)("span", { className: "graph-zoom", children: [Math.round(vp.scale * 100), "%"] })] }), (0, jsx_runtime_1.jsxs)("aside", { children: [(0, jsx_runtime_1.jsx)("h3", { children: "\u5173\u8054\u6700\u5F3A\u7684\u77E5\u8BC6\u70B9\u5BF9" }), pairs.map((e) => (0, jsx_runtime_1.jsxs)("button", { onClick: () => onPick(e.source), children: [(0, jsx_runtime_1.jsx)("span", { children: e.source }), (0, jsx_runtime_1.jsx)("i", { children: "\u00D7" }), (0, jsx_runtime_1.jsx)("span", { children: e.target }), (0, jsx_runtime_1.jsxs)("b", { children: [e.weight, " \u6B21"] })] }, e.source + e.target)), !pairs.length && (0, jsx_runtime_1.jsx)("p", { children: "\u9700\u8981\u81F3\u5C11\u4E00\u9053\u5305\u542B\u4E24\u4E2A\u77E5\u8BC6\u70B9\u7684\u9519\u9898\u3002" })] })] }) : (0, jsx_runtime_1.jsx)("div", { className: "empty", children: "\u6DFB\u52A0\u77E5\u8BC6\u70B9\u540E\u4F1A\u751F\u6210\u5173\u7CFB\u56FE\u3002" })] });
    }
    function layoutGraph(g) {
        const source = [...g.nodes].sort((a, b) => b.count - a.count).slice(0, 50);
        const allowed = new Set(source.map((x) => x.id));
        const max = Math.max(1, ...source.map((x) => x.count));
        const colors = ['#2563eb', '#059669', '#7c3aed', '#dc2626', '#d97706', '#0891b2', '#db2777', '#65a30d'];
        const nodes = source.map((n, i) => { const angle = 2 * Math.PI * i / Math.max(1, source.length); return { ...n, x: 300 + Math.cos(angle) * 170, y: 240 + Math.sin(angle) * 170, r: 16 + 22 * Math.sqrt(n.count / max), color: colors[i % colors.length] }; });
        const byId = new Map(nodes.map((n) => [n.id, n]));
        const edges = g.edges.filter((e) => allowed.has(e.source) && allowed.has(e.target)).map((e) => ({ ...e, source: byId.get(e.source), target: byId.get(e.target) }));
        for (let step = 0; step < 140; step++) {
            const force = nodes.map(() => ({ x: 0, y: 0 }));
            for (let i = 0; i < nodes.length; i++)
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d2 = Math.max(100, dx * dx + dy * dy), f = 9000 / d2, dist = Math.sqrt(d2);
                    force[i].x += dx / dist * f;
                    force[i].y += dy / dist * f;
                    force[j].x -= dx / dist * f;
                    force[j].y -= dy / dist * f;
                }
            for (const e of edges) {
                const dx = e.target.x - e.source.x, dy = e.target.y - e.source.y, dist = Math.max(1, Math.hypot(dx, dy)), f = (dist - 125) * .012;
                const sx = dx / dist * f, sy = dy / dist * f;
                const a = nodes.indexOf(e.source), b = nodes.indexOf(e.target);
                force[a].x += sx;
                force[a].y += sy;
                force[b].x -= sx;
                force[b].y -= sy;
            }
            nodes.forEach((n, i) => { force[i].x += (300 - n.x) * .002; force[i].y += (230 - n.y) * .002; n.x = Math.max(n.r + 15, Math.min(585 - n.r, n.x + force[i].x * .35)); n.y = Math.max(n.r + 15, Math.min(445 - n.r, n.y + force[i].y * .35)); });
        }
        return { nodes, edges };
    }
    function get(path) { return request(path, 'GET'); }
    function post(path, body) { return request(path, 'POST', body); }
    async function request(path, method = 'GET', body) { const r = await fetch(API + path, { method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-dsh-wrong-question-client': 'workspace' }, body: body === undefined ? undefined : JSON.stringify(body) }); const data = await r.json().catch(() => null); if (!r.ok)
        throw new Error(data?.error || `HTTP ${r.status}`); return data; }
    function splitList(value) { return [...new Set(value.split(/[,，;；\n]/).map(x => x.trim()).filter(Boolean))]; }
    function questionText(q) { return [q.content, q.answer, q.analysis, q.mistakeCause, q.ocrText, ...q.tags, ...q.knowledgePoints].join(' ').toLocaleLowerCase(); }
    function isDue(q) { return new Date(q.review.dueAt) <= new Date(); }
    function message(e) { return e instanceof Error ? e.message : String(e); }
    function labelGrade(g) { return { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' }[g]; }
    function nextHint(q, g) { if (g === 'again')
        return '稍后重来'; if (q.review.reps === 0)
        return g === 'easy' ? '约 1 天' : '1 天'; const factor = g === 'hard' ? 1.2 : g === 'easy' ? 1.3 * q.review.ease : q.review.ease; return `约 ${Math.max(1, Math.round(Math.max(1, q.review.intervalDays) * factor))} 天`; }
    function readImage(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
    function mediaUrl(value, kind) {
        if (typeof value !== 'string' || !value.trim())
            return undefined;
        const url = value.trim();
        if (url.startsWith('/') || /^https?:\/\//i.test(url))
            return url;
        if (kind === 'image' && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(url))
            return url;
        if (kind === 'video' && /^data:video\/(mp4|webm|ogg);base64,/i.test(url))
            return url;
        return undefined;
    }
    function questionImage(q) { return mediaUrl(q.imageData, 'image') || mediaUrl(q.imagePath, 'image') || (q.imagePath ? `${API}/questions/${encodeURIComponent(q.id)}/image` : undefined); }
    
    return module.exports;
  }
});
