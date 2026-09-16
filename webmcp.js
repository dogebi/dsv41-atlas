/* WebMCP tools for the Tensor Atlas (progressive enhancement).
 *
 * 규격: W3C WebMCP CG Draft / Chrome 149+ origin trial.
 *   - 도구 등록: await document.modelContext.registerTool({name, description, inputSchema, execute, annotations})
 *   - 과거 문서의 navigator.modelContext 는 Chrome 150에서 제거됨 → document 기준으로 feature-detect.
 *   - 로컬 확인: chrome://flags/#enable-webmcp-testing 활성화 → "Model Context Tool Inspector" 확장으로 검증.
 *   - 미지원 브라우저에서는 아무 것도 하지 않는다(기존 페이지 동작 불변).
 *
 * 데이터 출처는 페이지가 이미 노출하는 window.ATLAS_DEBUG 뿐이다(중복 상태 없음).
 */
(function () {
  'use strict';

  var mc = null;
  try { mc = document.modelContext || (window.navigator && window.navigator.modelContext) || null; } catch (e) { mc = null; }
  if (!mc || typeof mc.registerTool !== 'function') { return; }

  var ATLAS_WAIT_MS = 12000;

  function atlas() { return window.ATLAS_DEBUG || null; }

  function waitForAtlas(timeoutMs) {
    var t0 = Date.now();
    return new Promise(function (resolve, reject) {
      (function poll() {
        var d = atlas();
        if (d && d.app && d.engine) return resolve(d);
        if (Date.now() - t0 > (timeoutMs || ATLAS_WAIT_MS)) return reject(new Error('ATLAS_DEBUG not ready (atlas still loading)'));
        setTimeout(poll, 200);
      })();
    });
  }

  function num(n) { return (n == null ? 0 : n).toLocaleString('en-US'); }
  function billions(n) { return (n / 1e9).toFixed(2) + 'B'; }
  function bytes(n) { return (n / 1e9).toFixed(1) + ' GB'; }

  function allTensors(d) {
    var out = [];
    for (var i = 0; i < d.MODULES.length; i++) {
      var m = d.MODULES[i];
      var ws = m.ws || [];
      for (var j = 0; j < ws.length; j++) {
        out.push({
          module: m.id,
          module_label: m.label || m.id,
          layer: (m.index == null ? null : m.index),
          part: m.part || null,
          mode: m.mode || null,
          name: ws[j].name,
          shape: ws[j].shape,
          format: ws[j].format,
          cat: ws[j].cat,
          count: ws[j].count,
          params: ws[j].p,
          note: ws[j].note || null
        });
      }
    }
    return out;
  }

  function ok(payload) { return JSON.stringify(payload, null, 1); }
  function err(e) { return JSON.stringify({ error: String((e && e.message) || e) }, null, 1); }

  var TOOLS = [
    {
      name: 'get_model_overview',
      description: 'Return this atlas model\'s headline facts: model_type, architectures, dtype, total parameter count, per-precision totals (native/nvfp4/bf16), layer count and category summary. Use this first to understand what model is on the page.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: function () {
        return waitForAtlas().then(function (d) {
          var cfg = d.CFG || {};
          var cats = (d.CATEGORIES || []).map(function (c) {
            return { key: c[0], label: c[1], tensors: (c[3] || []).length };
          });
          return ok({
            model_type: cfg.model_type || null,
            architectures: cfg.architectures || null,
            dtype: cfg.dtype || null,
            transformers_version: cfg.transformers_version || null,
            quantization_config: cfg.quantization_config || null,
            total_params: d.TOTAL_P,
            total_params_label: billions(d.TOTAL_P),
            totals_by_precision: d.TOTALS || null,
            layer_modules: d.MODULES.length,
            categories: cats,
            current_precision: d.app.state.precision
          });
        }).catch(err);
      }
    },
    {
      name: 'list_categories',
      description: 'List the atlas tensor categories (e.g. routed experts, attention, vision) with their tensor counts and total parameter counts, so an agent can decide where to look.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: function () {
        return waitForAtlas().then(function (d) {
          var rows = (d.CATEGORIES || []).map(function (c) {
            var ws = c[3] || [], params = 0;
            for (var i = 0; i < ws.length; i++) params += (ws[i].p || 0);
            return { key: c[0], label: c[1], color: c[2], tensors: ws.length, params: params, params_label: billions(params) };
          });
          return ok({ categories: rows, total_tensors: allTensors(d).length });
        }).catch(err);
      }
    },
    {
      name: 'search_tensors',
      description: 'Search weight tensors by name substring, category, or storage format (e.g. "experts.w1", cat "attention", format "fp4"). Returns matching tensor names with shapes, formats, parameter counts and the module/layer they belong to.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Substring to match against the tensor name (case-insensitive). Leave empty to match all.' },
          category: { type: 'string', description: 'Exact category key, e.g. routed, attention, vision, engram, shared, vocab, dspark, other.' },
          format: { type: 'string', description: 'Storage format, e.g. fp4, fp8, bf16.' },
          module: { type: 'string', description: 'Restrict to one module id, e.g. embed or L0.' },
          limit: { type: 'integer', description: 'Max rows to return (default 20, max 200).' }
        },
        additionalProperties: false
      },
      annotations: { readOnlyHint: true },
      execute: function (a) {
        a = a || {};
        return waitForAtlas().then(function (d) {
          var q = (a.query || '').toLowerCase();
          var lim = Math.min(Math.max(parseInt(a.limit, 10) || 20, 1), 200);
          var rows = allTensors(d).filter(function (t) {
            if (q && String(t.name).toLowerCase().indexOf(q) === -1) return false;
            if (a.category && t.cat !== a.category) return false;
            if (a.format && t.format !== a.format) return false;
            if (a.module && t.module !== a.module) return false;
            return true;
          });
          return ok({
            total_matches: rows.length,
            returned: Math.min(rows.length, lim),
            tensors: rows.slice(0, lim).map(function (t) {
              return { name: t.name, module: t.module, cat: t.cat, format: t.format, shape: t.shape, count: t.count, params: t.params };
            })
          });
        }).catch(err);
      }
    },
    {
      name: 'get_tensor_detail',
      description: 'Fetch the full record for one tensor by exact name (as returned by search_tensors), including its shape, storage format, parameter count, and the explanatory note the atlas shows in its inspector panel.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Exact tensor name, e.g. "ffn.experts.w1.weight".' } },
        required: ['name'],
        additionalProperties: false
      },
      annotations: { readOnlyHint: true },
      execute: function (a) {
        a = a || {};
        return waitForAtlas().then(function (d) {
          var name = String(a.name || '');
          var hits = allTensors(d).filter(function (t) { return t.name === name; });
          if (!hits.length) {
            var near = allTensors(d).filter(function (t) { return t.name.indexOf(name) !== -1; }).slice(0, 10);
            return ok({ found: false, requested: name, suggestions: near.map(function (t) { return t.name; }) });
          }
          if (hits.length > 1) {
            return ok({ found: true, ambiguous: true, matches: hits.map(function (t) { return { name: t.name, module: t.module, cat: t.cat, shape: t.shape, format: t.format, count: t.count, params: t.params, note: t.note }; }) });
          }
          return ok({ found: true, tensor: hits[0] });
        }).catch(err);
      }
    },
    {
      name: 'focus_tensor',
      description: 'Navigate the atlas to a tensor so the user sees it highlighted in the 3D view and the inspector panel (uses the page\'s own selection logic). Use after search_tensors/get_tensor_detail. Returns the resulting view state.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Tensor name to focus, e.g. "ffn.experts.w1.weight".' },
          module: { type: 'string', description: 'Optional module id to disambiguate (e.g. L0).' }
        },
        required: ['name'],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, consequentialHint: false },
      execute: function (a) {
        a = a || {};
        return waitForAtlas().then(function (d) {
          var name = String(a.name || '');
          var modId = a.module || null;
          var hit = null;
          var list = allTensors(d);
          for (var i = 0; i < list.length; i++) {
            if (list[i].name === name && (!modId || list[i].module === modId)) { hit = list[i]; break; }
          }
          if (!hit) return ok({ focused: false, reason: 'tensor not found', requested: name, module: modId });
          d.app.select(hit.module, name);
          // React 상태 반영을 기다린 뒤 스냅샷 (즉시 읽으면 selected가 null로 나온다)
          return new Promise(function (resolve) {
            setTimeout(function () {
              var s = d.app.state;
              resolve(ok({ focused: true, module: hit.module, tensor: name, cat: hit.cat, format: hit.format, view: s.view, precision: s.precision, selected: s.selected, selected_tensor: s.tensor }));
            }, 200);
          });
        }).catch(err);
      }
    },
    {
      name: 'get_view_state',
      description: 'Report what the user is currently looking at in the atlas: view mode, precision, layout, selected module/tensor, filter, and animation state. Use it to answer "what am I looking at" or to stay in sync with the user.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: function () {
        return waitForAtlas().then(function (d) {
          var s = d.app.state;
          return ok({
            view: s.view, precision: s.precision, layout: s.layout, filter: s.filter,
            selected_module: s.selected, selected_tensor: s.tensor, hover_tensor: s.hoverTensor,
            playing: s.playing, timeline_time: s.time, expert_view: s.expertView, detail_layout: s.detailLayout
          });
        }).catch(err);
      }
    }
  ];

  function register(list) {
    // registerTool 우선, 없으면 provideContext({tools}) 로 폴백 (API 표면 변동 대응)
    if (typeof mc.registerTool !== 'function' && typeof mc.provideContext === 'function') {
      try {
        mc.provideContext({ tools: list });
        try { console.log('[webmcp] atlas tools provided via provideContext:', list.length); } catch (e) {}
      } catch (e) {
        try { console.warn('[webmcp] provideContext failed', e); } catch (e2) {}
      }
      return;
    }
    var i = 0;
    (function next() {
      if (i >= list.length) {
        try { console.log('[webmcp] atlas tools registered:', list.length, list.map(function (t) { return t.name; })); } catch (e) {}
        return;
      }
      var tool = list[i++];
      try {
        var p = mc.registerTool(tool);
        if (p && typeof p.then === 'function') { p.then(next, next); } else { next(); }
      } catch (e) {
        try { console.warn('[webmcp] registerTool failed for', tool.name, e); } catch (e2) {}
        next();
      }
    })();
  }

  // 디버깅/자동검증용 진입점 (inspector 확장 없이도 호출 가능)
  window.__WEBMCP_ATLAS = {
    tools: TOOLS,
    call: function (name, args) {
      for (var i = 0; i < TOOLS.length; i++) {
        if (TOOLS[i].name === name) return Promise.resolve(TOOLS[i].execute(args || {}));
      }
      return Promise.reject(new Error('unknown tool: ' + name));
    }
  };

  register(TOOLS);
})();
