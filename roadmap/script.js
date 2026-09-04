// 表示ロジック。データは data.js の phases / logs / START_DATE / EXAM_DATE を参照する。
(function () {
  function pct(date) {
    var v = (date - START_DATE) / (EXAM_DATE - START_DATE) * 100;
    return Math.max(0, Math.min(100, v));
  }
  function fmtShort(d) {
    return (d.getMonth() + 1) + "/" + d.getDate();
  }
  function fmtRange(a, b) {
    return fmtShort(a) + "〜" + fmtShort(b);
  }
  function fmtLong(d) {
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  }
  function dateKey(d) {
    return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function addDays(d, n) {
    var r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function scrollToEl(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  }

  document.getElementById("weaknessBasis").textContent = weaknessBasis;
  var weaknessListEl = document.getElementById("weaknessList");
  weaknesses.forEach(function (w) {
    var li = document.createElement("li");
    li.className = "weakness-item";
    li.innerHTML =
      '<span class="weakness-dot"></span>' +
      '<div class="weakness-body">' +
        '<span class="weakness-subject">' + w.subject + '</span>' +
        '<span class="weakness-pattern">' + w.pattern + '</span>' +
        '<span class="weakness-note">' + w.note + '</span>' +
      '</div>';
    weaknessListEl.appendChild(li);
  });
  document.getElementById("weaknessInsight").innerHTML = '<strong>共通パターン: </strong>' + weaknessInsight;
  document.getElementById("weaknessMethod").textContent = weaknessMethodNote;

  var now = new Date();
  var today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var exam0 = new Date(EXAM_DATE.getFullYear(), EXAM_DATE.getMonth(), EXAM_DATE.getDate());
  var diffDays = Math.round((exam0 - today0) / 86400000);

  var daysLeftEl = document.getElementById("daysLeft");
  var daysUnitEl = document.getElementById("daysUnit");
  if (diffDays > 0) {
    daysLeftEl.textContent = diffDays;
    daysUnitEl.textContent = "日";
  } else if (diffDays === 0) {
    daysLeftEl.textContent = "本番";
    daysUnitEl.textContent = "当日";
  } else {
    daysLeftEl.textContent = "終了";
    daysUnitEl.textContent = "";
  }
  document.getElementById("examDateLabel").textContent = fmtLong(EXAM_DATE) + " 実施";
  document.getElementById("countdownFill").style.width = pct(today0) + "%";

  document.getElementById("nowDate").textContent = fmtShort(today0);
  document.getElementById("nowMarker").style.left = pct(today0) + "%";
  document.getElementById("jumpTodayBtn").addEventListener("click", function () {
    scrollToEl(document.getElementById("nowMarker"));
  });

  var currentPhase = phases[phases.length - 1];
  for (var i = 0; i < phases.length; i++) {
    if (today0 < phases[i].end || i === phases.length - 1) { currentPhase = phases[i]; break; }
  }

  var segmentsEl = document.getElementById("segments");
  var flagsEl = document.getElementById("flags");
  phases.forEach(function (p) {
    var left = pct(p.start), right = pct(p.end);
    var seg = document.createElement("div");
    seg.className = "segment" + (p.id === currentPhase.id ? " is-current" : "");
    seg.style.left = left + "%";
    seg.style.width = Math.max(0, right - left) + "%";
    segmentsEl.appendChild(seg);

    var flag = document.createElement("button");
    flag.type = "button";
    flag.className = "flag" + (p.id === currentPhase.id ? " is-current" : "");
    flag.style.left = left + "%";
    flag.dataset.phaseId = p.id;
    flag.innerHTML =
      '<span class="flag-dot"></span>' +
      '<span class="flag-label"><span class="flag-name">' + p.name + '</span><span class="flag-dates">' + fmtShort(p.start) + '</span></span>';
    flag.addEventListener("click", function () { selectPhase(parseInt(this.dataset.phaseId, 10)); });
    flagsEl.appendChild(flag);
  });

  var goalMarker = document.createElement("div");
  goalMarker.className = "goal-marker";
  goalMarker.innerHTML =
    '<span class="goal-dot"></span>' +
    '<span class="goal-label"><span class="goal-name">ゴール(試験日)</span><span class="goal-date">' + fmtShort(EXAM_DATE) + '</span></span>';
  flagsEl.appendChild(goalMarker);

  var logDotsEl = document.getElementById("logDots");
  logs.forEach(function (log, idx) {
    var dot = document.createElement("button");
    dot.type = "button";
    dot.className = "logdot";
    dot.style.left = pct(log.date) + "%";
    dot.title = fmtShort(log.date) + " " + log.subject;
    dot.setAttribute("aria-label", fmtShort(log.date) + "の学習記録(" + log.subject + ")を表示");
    dot.addEventListener("click", function () { jumpToHistory(idx); });
    logDotsEl.appendChild(dot);
  });

  var logsByDateKey = {};
  logs.forEach(function (log, idx) {
    var k = dateKey(log.date);
    if (!logsByDateKey[k]) logsByDateKey[k] = [];
    logsByDateKey[k].push(idx);
  });

  function startOfWeekSunday(d) { return addDays(d, -d.getDay()); }
  var gridStart = startOfWeekSunday(START_DATE);
  var totalCols = Math.ceil((Math.round((EXAM_DATE - gridStart) / 86400000) + 1) / 7);

  var heatmapGridEl = document.getElementById("heatmapGrid");
  var heatmapMonthsEl = document.getElementById("heatmapMonths");
  heatmapGridEl.style.gridTemplateColumns = "repeat(" + totalCols + ", 14px)";
  heatmapMonthsEl.style.gridTemplateColumns = "repeat(" + totalCols + ", 14px)";

  var lastLabeledMonth = -1;
  for (var col = 0; col < totalCols; col++) {
    var monthLabel = "";
    for (var mrow = 0; mrow < 7; mrow++) {
      var md = addDays(gridStart, col * 7 + mrow);
      if (md >= START_DATE && md <= EXAM_DATE && md.getDate() <= 7 && md.getMonth() !== lastLabeledMonth) {
        monthLabel = (md.getMonth() + 1) + "月";
        lastLabeledMonth = md.getMonth();
      }
    }
    var monthSpan = document.createElement("span");
    monthSpan.textContent = monthLabel;
    heatmapMonthsEl.appendChild(monthSpan);

    for (var row = 0; row < 7; row++) {
      var date = addDays(gridStart, col * 7 + row);
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "heatmap-cell";
      if (date < START_DATE || date > EXAM_DATE) {
        cell.className += " is-pad";
        cell.disabled = true;
        cell.tabIndex = -1;
      } else {
        var dk = dateKey(date);
        var hasLog = !!logsByDateKey[dk];
        if (hasLog) cell.className += " has-log";
        if (sameDay(date, today0)) cell.className += " is-today";
        if (date > today0) cell.className += " is-future";
        var subjectsOnDay = hasLog ? logsByDateKey[dk].map(function (i) { return logs[i].subject; }).join("・") : "学習記録なし";
        cell.title = fmtLong(date) + " — " + subjectsOnDay;
        cell.setAttribute("aria-label", cell.title);
        if (hasLog) {
          (function (firstIdx) {
            cell.addEventListener("click", function () { jumpToHistory(firstIdx); });
          })(logsByDateKey[dk][0]);
        } else {
          cell.disabled = true;
        }
      }
      heatmapGridEl.appendChild(cell);
    }
  }

  var detailPanel = document.getElementById("detailPanel");
  function selectPhase(id) {
    var p = phases.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    document.querySelectorAll(".flag").forEach(function (f) {
      f.classList.toggle("is-active", parseInt(f.dataset.phaseId, 10) === id);
    });
    var statusLabel = "予定", statusClass = "";
    if (p.id === currentPhase.id) { statusLabel = "進行中"; statusClass = "is-current"; }
    else if (p.end <= today0) { statusLabel = "完了"; statusClass = "is-done"; }
    detailPanel.innerHTML =
      '<div class="detail-head">' +
        '<span class="detail-index">0' + p.id + '</span>' +
        '<div class="detail-headtext">' +
          '<h3>' + p.name + '</h3>' +
          '<p class="detail-range">' + fmtRange(p.start, p.end) + '</p>' +
        '</div>' +
        '<span class="pill ' + statusClass + '">' + statusLabel + '</span>' +
      '</div>' +
      '<p class="detail-content">' + p.content + '</p>' +
      '<p class="detail-goal"><strong>ゴール:</strong> ' + p.goal + '</p>';
  }
  selectPhase(currentPhase.id);

  var subjects = [];
  logs.forEach(function (log) { if (subjects.indexOf(log.subject) === -1) subjects.push(log.subject); });
  var filterChipsEl = document.getElementById("filterChips");
  var allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = "chip is-active";
  allChip.textContent = "すべて";
  allChip.dataset.subject = "all";
  filterChipsEl.appendChild(allChip);
  subjects.forEach(function (s) {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = s;
    chip.dataset.subject = s;
    filterChipsEl.appendChild(chip);
  });
  filterChipsEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (!btn) return;
    filterChipsEl.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
    btn.classList.add("is-active");
    var filter = btn.dataset.subject;
    document.querySelectorAll(".history-item").forEach(function (li) {
      li.style.display = (filter === "all" || li.dataset.subject === filter) ? "" : "none";
    });
  });

  var historyListEl = document.getElementById("historyList");
  var sortedLogs = logs.map(function (l, i) { return { log: l, idx: i }; }).sort(function (a, b) { return b.log.date - a.log.date; });
  sortedLogs.forEach(function (entry) {
    var log = entry.log;
    var li = document.createElement("li");
    li.className = "history-item";
    li.id = "history-" + entry.idx;
    li.dataset.subject = log.subject;
    var notesHtml = log.notes.map(function (n) { return "<li>" + n + "</li>"; }).join("");
    li.innerHTML =
      '<div class="history-head">' +
        '<span class="history-date">' + fmtLong(log.date) + '</span>' +
        '<span class="history-subject">' + log.subject + '</span>' +
      '</div>' +
      '<p class="history-content">' + log.content + '</p>' +
      '<details>' +
        '<summary>感想・メモを見る</summary>' +
        '<div class="history-body">' +
          '<div><p class="label">感想</p><p>' + log.impression + '</p></div>' +
          '<div><p class="label">メモ</p><ul>' + notesHtml + '</ul></div>' +
        '</div>' +
      '</details>';
    historyListEl.appendChild(li);
  });

  function jumpToHistory(idx) {
    var el = document.getElementById("history-" + idx);
    if (!el) return;
    var details = el.querySelector("details");
    if (details) details.open = true;
    scrollToEl(el);
    el.classList.add("is-flash");
    setTimeout(function () { el.classList.remove("is-flash"); }, 1200);
  }

  document.getElementById("lastUpdated").textContent = fmtLong(logs[logs.length - 1] ? logs.map(function (l) { return l.date; }).sort(function (a, b) { return b - a; })[0] : now);
})();
