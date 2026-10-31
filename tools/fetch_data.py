#!/usr/bin/env python3
"""Fetch real economic time series for the replay chapter of the Cross-Section site.

Standard library only. Reads API keys from ../.env (relative to this file), pulls
series from Bank of Korea ECOS, KOSIS, FRED, EIA and OpenDART, and writes small
JSON files plus SOURCES.md into prototype/traditional/data/.

    python3 tools/fetch_data.py                  # rebuild everything
    python3 tools/fetch_data.py oil korea-1997   # rebuild only these files

Rerunnable: every file is rebuilt from scratch. If a required series fails, the
existing file is left untouched. Keys never leave this process: they are only
substituted into request URLs, and every error message is redacted.
"""
import datetime
import io
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ENV_PATH = os.path.join(ROOT, ".env")
OUT_DIR = os.path.join(ROOT, "prototype", "traditional", "data")
TODAY = datetime.date.today()
KEY_NAMES = ("ECOS_KEY", "KOSIS_KEY", "FRED_KEY", "EIA_KEY", "OPENDART_KEY")


# --------------------------------------------------------------------------- keys

def load_env(path):
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            if k.startswith("export "):
                k = k[len("export "):].strip()
            env[k] = v.strip().strip('"').strip("'")
    return env


ENV = {}


def redact(text):
    text = str(text)
    for name in KEY_NAMES:
        v = ENV.get(name)
        if v:
            text = text.replace(v, "***")
            text = text.replace(urllib.parse.quote(v, safe=""), "***")
    return text


class FetchError(Exception):
    pass


def fill(template):
    """Substitute {ECOS_KEY}-style placeholders. Only used for the live request."""
    url = template
    for name in KEY_NAMES:
        token = "{" + name + "}"
        if token in url:
            if not ENV.get(name):
                raise FetchError("missing %s in .env" % name)
            url = url.replace(token, urllib.parse.quote(ENV[name], safe=""))
    return url


def doc_url(template):
    """URL template for SOURCES.md with every key shown as {KEY}."""
    for name in KEY_NAMES:
        template = template.replace("{" + name + "}", "{KEY}")
    return template


def http_get(template, raw=False, tries=3):
    url = fill(template)
    err = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "cross-section-data/1.0"})
            with urllib.request.urlopen(req, timeout=120) as r:
                body = r.read()
            break
        except Exception as e:  # noqa: BLE001 - redacted and re-raised below
            err = "%s: %s" % (type(e).__name__, e)
            time.sleep(1.5 * (attempt + 1))
    else:
        raise FetchError(redact("%s <- %s" % (err, doc_url(template)))) from None
    if raw:
        return body
    text = body.decode("utf-8", "replace")
    try:
        return json.loads(text)
    except ValueError:
        raise FetchError(redact("non-JSON reply from %s: %s" % (doc_url(template), text[:200]))) from None


# --------------------------------------------------------------------------- providers

def ecos_template(code, cycle, start, end, items, first=1, last=10000):
    return ("https://ecos.bok.or.kr/api/StatisticSearch/{ECOS_KEY}/json/kr/%d/%d/%s/%s/%s/%s/%s"
            % (first, last, code, cycle, start, end, "/".join(items)))


def ecos(code, cycle, start, end, *items):
    """Return [(time, float)] from ECOS StatisticSearch, paging through all rows."""
    out, first, page = [], 1, 10000
    while True:
        d = http_get(ecos_template(code, cycle, start, end, items, first, first + page - 1))
        if "StatisticSearch" not in d:
            raise FetchError("ECOS %s %s: %s" % (code, "/".join(items), redact(json.dumps(d, ensure_ascii=False)[:200])))
        blk = d["StatisticSearch"]
        for r in blk["row"]:
            v = (r.get("DATA_VALUE") or "").replace(",", "").strip()
            if v in ("", "-", "."):
                continue
            out.append((r["TIME"], float(v)))
        total = int(blk.get("list_total_count", 0))
        first += page
        if first > total:
            break
    if not out:
        raise FetchError("ECOS %s %s: no rows" % (code, "/".join(items)))
    return out


def ecos_doc(code, cycle, items):
    return doc_url(ecos_template(code, cycle, "{START}", "{END}", items, 1, 10000))


def kosis_template(org, tbl, itm, obj1, prd, start, end):
    return ("https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey={KOSIS_KEY}"
            "&orgId=%s&tblId=%s&itmId=%s&objL1=%s&objL2=&objL3=&objL4=&objL5=&objL6=&objL7=&objL8="
            "&prdSe=%s&startPrdDe=%s&endPrdDe=%s&format=json&jsonVD=Y" % (org, tbl, itm, obj1, prd, start, end))


def kosis(org, tbl, itm, obj1, prd, start, end):
    d = http_get(kosis_template(org, tbl, itm, obj1, prd, start, end))
    if not isinstance(d, list):
        raise FetchError("KOSIS %s: %s" % (tbl, redact(json.dumps(d, ensure_ascii=False)[:200])))
    out = []
    for r in d:
        v = str(r.get("DT", "")).replace(",", "").strip()
        if v in ("", "-", "."):
            continue
        out.append((r["PRD_DE"], float(v)))
    return out


def fred_template(sid, **params):
    q = "".join("&%s=%s" % (k, v) for k, v in params.items())
    return ("https://api.stlouisfed.org/fred/series/observations?series_id=%s&api_key={FRED_KEY}&file_type=json%s"
            % (sid, q))


def fred(sid, **params):
    """Return [(YYYY-MM-DD, float)]; FRED marks missing values with '.'."""
    d = http_get(fred_template(sid, **params))
    if "observations" not in d:
        raise FetchError("FRED %s: %s" % (sid, redact(json.dumps(d)[:200])))
    return [(o["date"], float(o["value"])) for o in d["observations"] if o["value"] not in (".", "")]


EIA_BRENT = ("https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key={EIA_KEY}&frequency=monthly"
             "&data%5B0%5D=value&facets%5Bseries%5D%5B%5D=RBRTE"
             "&sort%5B0%5D%5Bcolumn%5D=period&sort%5B0%5D%5Bdirection%5D=asc&offset=0&length=5000")


def eia_brent_monthly():
    d = http_get(EIA_BRENT)
    rows = d.get("response", {}).get("data")
    if not rows:
        raise FetchError("EIA RBRTE: %s" % redact(json.dumps(d)[:200]))
    return [(r["period"], float(r["value"])) for r in rows if r.get("value") not in (None, "")]


# --------------------------------------------------------------------------- transforms

def num(x, nd):
    v = round(x, nd)
    return int(v) if v == int(v) and abs(v) < 1e15 else v


def ym(t):
    """ECOS 'YYYYMM' / FRED 'YYYY-MM-DD' / EIA 'YYYY-MM' -> 'YYYY-MM'."""
    t = t.replace("-", "")
    return "%s-%s" % (t[:4], t[4:6])


def window(points, start=None, end=None):
    return [p for p in points if (start is None or p[0] >= start) and (end is None or p[0] <= end)]


def annual_mean(monthly, gaps=None):
    """[(YYYY-MM, v)] -> [(YYYY, mean)] for closed calendar years.

    A year counts when its December is published and at most two months are
    missing (e.g. BLS skipped October 2025 during the federal shutdown); such
    years are averaged over the months available and recorded in `gaps`.
    """
    by = {}
    for t, v in monthly:
        by.setdefault(t[:4], {})[t[5:7]] = v
    out = []
    for y, ms in sorted(by.items()):
        if "12" not in ms or len(ms) < 10:
            continue
        if len(ms) < 12 and gaps is not None:
            gaps.append("%s (missing %s)" % (y, ", ".join("%s-%02d" % (y, m) for m in range(1, 13)
                                                         if "%02d" % m not in ms)))
        out.append((y, sum(ms.values()) / len(ms)))
    return out


def gap_note(gaps):
    if not gaps:
        return None
    why = ""
    if any("2025-10" in g for g in gaps):
        why = " BLS published no October 2025 figure (US federal government shutdown)."
    return "Annual mean over the months available for %s.%s" % ("; ".join(gaps), why)


def pct_change(points, lag):
    """YoY / period-on-period % change over `lag` observations, matched by key."""
    idx = {t: v for t, v in points}
    keys = [t for t, _ in points]
    out = []
    for i, t in enumerate(keys):
        if i >= lag:
            prev = idx[keys[i - lag]]
            out.append((t, (idx[t] / prev - 1.0) * 100.0))
    return out


def yoy_monthly(points):
    """Monthly YoY, matching YYYY-MM with (YYYY-1)-MM so gaps never misalign."""
    idx = dict(points)
    out = []
    for t, v in points:
        prev = "%04d-%s" % (int(t[:4]) - 1, t[5:7])
        if prev in idx:
            out.append((t, (v / idx[prev] - 1.0) * 100.0))
    return out


def daily_to_monthly(daily, how):
    by = {}
    for t, v in daily:
        by.setdefault(ym(t), []).append((t, v))
    out = []
    for m, rows in sorted(by.items()):
        rows.sort()
        out.append((m, rows[-1][1] if how == "last" else sum(v for _, v in rows) / len(rows)))
    return out


# --------------------------------------------------------------------------- series records

def series(key, label, unit, freq, points, nd, source, provider, codes, url, transform, note=None):
    pts = [[t, num(v, nd)] for t, v in points]
    if not pts:
        raise FetchError("%s: empty after transforms" % key)
    s = {"key": key, "label": label, "unit": unit, "freq": freq, "source": source, "points": pts}
    if note:
        s["note"] = note
    s["_doc"] = {"provider": provider, "codes": codes, "url": url, "transform": transform}
    return s


def try_optional(log, fn):
    try:
        return fn()
    except Exception as e:  # noqa: BLE001
        log.append("optional series skipped: %s" % redact(e))
        return None


ECOS_SRC = "Bank of Korea ECOS"


# ---- reusable fetchers -----------------------------------------------------

def s_krwusd(key, start, end, sub="0000100"):
    pts = [(ym(t), v) for t, v in ecos("731Y004", "M", start.replace("-", ""), end.replace("-", ""), "0000001", sub)]
    avg = sub == "0000100"
    return series(
        key,
        "Won per dollar, monthly average" if avg else "Won per dollar, end of month",
        "KRW per USD", "M", pts, 2,
        "%s, stat 731Y004 item 0000001 (KRW/USD base rate) / %s (%s)"
        % (ECOS_SRC, sub, "monthly average" if avg else "end-of-month"),
        ECOS_SRC, "731Y004 (3.1.2.1 주요국 통화의 대원화환율), cycle M, item1 0000001 원/미국달러(매매기준율), item2 %s %s"
        % (sub, "평균자료" if avg else "말일자료"),
        ecos_doc("731Y004", "M", ["0000001", sub]), "none (as published)")


def s_base_rate(key, start, end):
    pts = [(ym(t), v) for t, v in ecos("722Y001", "M", start.replace("-", ""), end.replace("-", ""), "0101000")]
    return series(
        key, "Bank of Korea base rate", "% per year", "M", pts, 2,
        "%s, stat 722Y001 item 0101000 (monthly; level at month end)" % ECOS_SRC,
        ECOS_SRC, "722Y001 (1.3.1 한국은행 기준금리 및 여수신금리), cycle M, item 0101000 한국은행 기준금리",
        ecos_doc("722Y001", "M", ["0101000"]),
        "none; ECOS monthly value is the rate in force at month end (e.g. 2008-10 = 4.25 after the 27 Oct cut)",
        note="Series starts May 1999. Until Mar 2008 the policy instrument was the overnight call-rate target; since then the BOK base rate.")


def s_fedfunds(key, start, end):
    pts = [(ym(t), v) for t, v in fred("FEDFUNDS", observation_start=start + "-01", observation_end=end + "-28")]
    return series(
        key, "US effective federal funds rate", "% per year", "M", pts, 2,
        "FRED FEDFUNDS (monthly average of daily effective rate)",
        "FRED (Federal Reserve Bank of St. Louis); original source Board of Governors", "FEDFUNDS",
        doc_url(fred_template("FEDFUNDS", observation_start="{START}", observation_end="{END}")), "none (as published)")


def s_us_cpi_yoy(key, start, end):
    raw = [(ym(t), v) for t, v in fred("CPIAUCSL")]
    pts = window(yoy_monthly(raw), start, end)
    return series(
        key, "US CPI inflation, year over year", "%", "M", pts, 2,
        "FRED CPIAUCSL (CPI-U all items, SA, 1982-84=100), YoY % computed",
        "FRED; original source U.S. Bureau of Labor Statistics", "CPIAUCSL",
        doc_url(fred_template("CPIAUCSL")), "YoY % change of monthly index: (I_t / I_{t-12} - 1) * 100",
        note=("No value for 2025-10 (BLS did not publish October 2025 CPI because of the federal shutdown)."
              if any(t == "2024-10" for t, _ in pts) and not any(t == "2025-10" for t, _ in pts) else None))


def s_kr_cpi_yoy(key, start, end):
    y0 = "%04d01" % (int(start[:4]) - 1)
    raw = [(ym(t), v) for t, v in ecos("901Y009", "M", y0, end.replace("-", ""), "0")]
    pts = window(yoy_monthly(raw), start, end)
    return series(
        key, "Korea CPI inflation, year over year", "%", "M", pts, 2,
        "%s, stat 901Y009 item 0 (CPI all items, 2020=100), YoY %% computed" % ECOS_SRC,
        ECOS_SRC, "901Y009 (4.2.1 소비자물가지수), cycle M, item 0 총지수",
        ecos_doc("901Y009", "M", ["0"]),
        "YoY % change of monthly index (I_t / I_{t-12} - 1) * 100; may differ from Statistics Korea's "
        "headline by +-0.1 pt because the published index is rounded")


def s_brent(key, start=None, end=None):
    pts = window([(ym(t), v) for t, v in eia_brent_monthly()], start, end)
    return series(
        key, "Brent crude spot price, monthly average", "USD per barrel", "M", pts, 2,
        "EIA API v2, petroleum/pri/spt, series RBRTE (Europe Brent Spot Price FOB), monthly",
        "U.S. Energy Information Administration (EIA) API v2", "route petroleum/pri/spt, facet series=RBRTE, frequency monthly",
        doc_url(EIA_BRENT), "none (EIA monthly average of daily spot prices)")


# --------------------------------------------------------------------------- files

def build_korea_growth(log):
    end = str(TODAY.year)
    rgdp = dict(ecos("200Y110", "A", "1953", end, "10601"))           # real GDP, chained 2020, KRW bn
    nom = ecos("200Y109", "A", "1953", end, "10601")                  # nominal GDP, KRW bn
    gfcf = dict(ecos("200Y109", "A", "1953", end, "1020110"))         # nominal GFCF, KRW bn
    pop = dict(ecos("901Y028", "A", "1960", end, "I35A"))             # population, persons
    last = max(rgdp)                                                  # last year with GDP
    years = sorted(y for y in rgdp if "1960" <= y <= last)
    pop_pts = [(y, pop[y]) for y in sorted(pop) if y <= last]

    out = [
        series("rgdp", "Real GDP (expenditure side, chained 2020 prices)", "KRW trillion (2020 prices)", "A",
               [(y, rgdp[y] / 1000.0) for y in years], 1,
               "%s, stat 200Y110 item 10601 (GDP expenditure, real, annual)" % ECOS_SRC,
               ECOS_SRC, "200Y110 (2.1.2.2.4 국내총생산에 대한 지출, 원계열, 실질, 분기 및 연간), cycle A, item 10601 국내총생산에 대한 지출",
               ecos_doc("200Y110", "A", ["10601"]), "KRW billion / 1000 -> KRW trillion; restricted to 1960+"),
        series("pop", "Population (mid-year estimate)", "million persons", "A",
               [(y, v / 1e6) for y, v in pop_pts], 3,
               "%s, stat 901Y028 item I35A (추계인구, Statistics Korea population projections)" % ECOS_SRC,
               ECOS_SRC, "901Y028 (8.6.1 추계인구/고령인구비율/합계출산율), cycle A, item I35A 추계인구",
               ecos_doc("901Y028", "A", ["I35A"]),
               "persons / 1e6; cut at the last GDP year (the table continues with projections to 2072)"),
        series("rgdppc", "Real GDP per capita (chained 2020 prices)", "million KRW per person (2020 prices)", "A",
               [(y, rgdp[y] * 1e9 / pop[y] / 1e6) for y in years if y in pop], 3,
               "Derived: ECOS 200Y110/10601 real GDP divided by ECOS 901Y028/I35A population",
               ECOS_SRC, "200Y110/10601 and 901Y028/I35A", ecos_doc("200Y110", "A", ["10601"]),
               "real GDP (KRW) / population, in million KRW"),
        series("gfcf_share", "Gross fixed capital formation, share of GDP (nominal)", "% of GDP", "A",
               [(y, gfcf[y] / v * 100.0) for y, v in nom if "1960" <= y <= last and y in gfcf], 2,
               "%s, stat 200Y109 items 1020110 (GFCF) / 10601 (GDP), nominal, annual" % ECOS_SRC,
               ECOS_SRC, "200Y109 (2.1.2.2.3 국내총생산에 대한 지출, 원계열, 명목, 분기 및 연간), cycle A, items 1020110 총고정자본형성, 10601 국내총생산에 대한 지출",
               ecos_doc("200Y109", "A", ["1020110"]),
               "nominal GFCF / nominal GDP * 100 (matches ECOS 200Y101/60102 to 1 decimal)"),
        series("popgrowth", "Population growth rate", "% per year", "A",
               pct_change(pop_pts, 1), 2,
               "Derived from %s stat 901Y028 item I35A" % ECOS_SRC,
               ECOS_SRC, "901Y028/I35A", ecos_doc("901Y028", "A", ["I35A"]),
               "(P_t / P_{t-1} - 1) * 100 of mid-year population"),
    ]
    emp_s = try_optional(log, lambda: kosis("101", "DT_1DA7010S", "T30", "00", "Y", "1963", end))
    if emp_s:
        emp = {y: v for y, v in emp_s if y <= last}
        out.append(series(
            "emp", "Employed persons (Economically Active Population Survey)", "million persons", "A",
            sorted((y, v / 1000.0) for y, v in emp.items()), 3,
            "KOSIS (Statistics Korea), table DT_1DA7010S, item T30 (취업자), class 00 (계)",
            "KOSIS OpenAPI (Statistics Korea, orgId 101)",
            "orgId 101, tblId DT_1DA7010S (종사상지위별 취업자), itmId T30 취업자, objL1 00 계, prdSe Y",
            doc_url(kosis_template("101", "DT_1DA7010S", "T30", "00", "Y", "{START}", "{END}")),
            "thousand persons / 1000 -> million persons",
            note="Survey basis changed in 1999 (4-week job search); employment counts are comparable across the break."))
        out.append(series(
            "rgdppw", "Real GDP per employed person (chained 2020 prices)", "million KRW per worker (2020 prices)", "A",
            [(y, rgdp[y] * 1e9 / (emp[y] * 1000.0) / 1e6) for y in years if y in emp], 2,
            "Derived: ECOS 200Y110/10601 real GDP divided by KOSIS DT_1DA7010S/T30 employment",
            "ECOS + KOSIS", "200Y110/10601 and KOSIS DT_1DA7010S/T30/00", ecos_doc("200Y110", "A", ["10601"]),
            "real GDP (KRW) / employed persons, in million KRW"))
    return {"id": "korea-growth", "title": "Korea, 1960 onward: output, investment, population, employment",
            "series": out}


def build_us_phillips(log):
    unr = [(ym(t), v) for t, v in fred("UNRATE")]
    cpi = [(ym(t), v) for t, v in fred("CPIAUCSL")]
    g_unr, g_cpi = [], []
    unr_a, cpi_a = annual_mean(unr, g_unr), annual_mean(cpi, g_cpi)
    out = [
        series("unrate", "US unemployment rate, annual mean", "%", "A", unr_a, 2,
               "FRED UNRATE (civilian unemployment rate, SA), annual mean of monthly values",
               "FRED; original source U.S. Bureau of Labor Statistics", "UNRATE",
               doc_url(fred_template("UNRATE")),
               "annual mean of monthly values; current (unfinished) year dropped", note=gap_note(g_unr)),
        series("cpi_infl", "US CPI inflation, annual average over annual average", "%", "A",
               pct_change(cpi_a, 1), 2,
               "FRED CPIAUCSL (CPI-U all items, SA), annual-average index, YoY %",
               "FRED; original source U.S. Bureau of Labor Statistics", "CPIAUCSL",
               doc_url(fred_template("CPIAUCSL")),
               "annual mean of monthly index, then (A_t / A_{t-1} - 1) * 100; current (unfinished) year dropped",
               note=gap_note(g_cpi)),
    ]
    mich = try_optional(log, lambda: [(ym(t), v) for t, v in fred("MICH")])
    if mich:
        out.append(series(
            "mich", "Expected inflation next 12 months (Michigan survey median), annual mean", "%", "A",
            annual_mean(mich, []), 2,
            "FRED MICH (University of Michigan inflation expectation), annual mean of monthly values",
            "FRED; original source University of Michigan Surveys of Consumers", "MICH",
            doc_url(fred_template("MICH")), "annual mean of 12 monthly values; current (unfinished) year dropped"))
    return {"id": "us-phillips", "title": "United States, 1948 onward: unemployment, inflation, expectations",
            "series": out}


def build_oil(log):
    wti = [(ym(t), v) for t, v in fred("WTISPLC")]
    return {"id": "oil", "title": "Crude oil prices, monthly",
            "series": [
                series("wti", "WTI crude spot price, monthly average", "USD per barrel", "M", wti, 2,
                       "FRED WTISPLC (Spot Crude Oil Price: West Texas Intermediate), monthly",
                       "FRED; original source Federal Reserve Bank of St. Louis / Dow Jones & Co. (pre-1982 posted prices)",
                       "WTISPLC", doc_url(fred_template("WTISPLC")), "none (as published)",
                       note="Before the mid-1980s this is a posted/administered price, not a market spot price."),
                s_brent("brent"),
            ]}


def build_korea_1997(log):
    a, b = "1995-01", "1999-12"
    reserves = [(ym(t), v / 1e6) for t, v in ecos("732Y001", "M", "199501", "199912", "99")]
    call = [(ym(t), v) for t, v in ecos("721Y001", "M", "199501", "199912", "1010000")]
    ca = [(ym(t), v / 1000.0) for t, v in ecos("301Y013", "M", "199501", "199912", "000000")]
    kospi_d = ecos("802Y001", "D", "19950101", "19991231", "0001000")
    return {"id": "korea-1997", "title": "Korea's currency crisis, 1995-1999",
            "series": [
                s_krwusd("krwusd", a, b, "0000100"),
                s_krwusd("krwusd_eom", a, b, "0000200"),
                series("reserves", "Official foreign exchange reserves (gross, end of month)", "USD billion", "M", reserves, 3,
                       "%s, stat 732Y001 item 99 (total reserves: gold+SDR+IMF position+FX)" % ECOS_SRC,
                       ECOS_SRC, "732Y001 (3.5 외환보유액), cycle M, item 99 합계",
                       ecos_doc("732Y001", "M", ["99"]), "thousand USD / 1e6 -> USD billion",
                       note="Gross official reserves; 'usable' reserves in Dec 1997 were far lower (about USD 9bn) because of deposits at banks' overseas branches."),
                series("callrate", "Overnight call rate (uncollateralized), monthly average", "% per year", "M", call, 2,
                       "%s, stat 721Y001 item 1010000 (무담보콜금리 1일)" % ECOS_SRC,
                       ECOS_SRC, "721Y001 (1.3.2.2 시장금리 월,분기,년), cycle M, item 1010000 무담보콜금리(1일)",
                       ecos_doc("721Y001", "M", ["1010000"]), "none (ECOS monthly average)"),
                series("ca", "Current account balance, monthly", "USD billion", "M", ca, 3,
                       "%s, stat 301Y013 item 000000 (경상수지, BPM6)" % ECOS_SRC,
                       ECOS_SRC, "301Y013 (2.5.1.1 국제수지), cycle M, item 000000 경상수지",
                       ecos_doc("301Y013", "M", ["000000"]), "USD million / 1000 -> USD billion"),
                series("kospi", "KOSPI, monthly average of daily closes", "index (1980-01-04 = 100)", "M",
                       daily_to_monthly(kospi_d, "mean"), 2,
                       "%s, stat 802Y001 item 0001000 (KOSPI, daily), averaged by month" % ECOS_SRC,
                       ECOS_SRC, "802Y001 (1.5.1.1 주식시장(일)), cycle D, item 0001000 KOSPI지수",
                       ecos_doc("802Y001", "D", ["0001000"]),
                       "monthly mean of daily closing values (ECOS monthly KOSPI table 901Y014 starts only in 2000)"),
                series("kospi_eom", "KOSPI, last close of month", "index (1980-01-04 = 100)", "M",
                       daily_to_monthly(kospi_d, "last"), 2,
                       "%s, stat 802Y001 item 0001000 (KOSPI, daily), last trading day of month" % ECOS_SRC,
                       ECOS_SRC, "802Y001, cycle D, item 0001000 KOSPI지수",
                       ecos_doc("802Y001", "D", ["0001000"]), "value on the last trading day of each month"),
            ]}


def build_crisis_2008(log):
    a, b = "2006-01", "2010-12"
    ted_m = [(ym(t), v) for t, v in fred("TEDRATE", observation_start="2006-01-01", observation_end="2010-12-31",
                                          frequency="m", aggregation_method="avg")]
    ted_w = fred("TEDRATE", observation_start="2006-01-01", observation_end="2010-12-31",
                 frequency="wef", aggregation_method="avg")
    baa = [(ym(t), v) for t, v in fred("BAA10Y", observation_start="2006-01-01", observation_end="2010-12-31",
                                        frequency="m", aggregation_method="avg")]
    tdoc = fred_template("TEDRATE", observation_start="2006-01-01", observation_end="2010-12-31",
                         frequency="{m|wef}", aggregation_method="avg")
    return {"id": "crisis-2008", "title": "The 2008 financial crisis, 2006-2010",
            "series": [
                series("ted", "TED spread (3-month LIBOR minus 3-month T-bill), monthly average", "percentage points", "M",
                       ted_m, 2, "FRED TEDRATE (daily), monthly average via FRED aggregation",
                       "FRED; ICE Benchmark Administration / Board of Governors", "TEDRATE",
                       doc_url(tdoc), "FRED server-side aggregation frequency=m, aggregation_method=avg"),
                series("ted_w", "TED spread, weekly average (week ending Friday)", "percentage points", "W",
                       ted_w, 2, "FRED TEDRATE (daily), weekly average via FRED aggregation",
                       "FRED; ICE Benchmark Administration / Board of Governors", "TEDRATE",
                       doc_url(tdoc), "FRED server-side aggregation frequency=wef (week ending Friday), aggregation_method=avg; keys are the week-ending date"),
                s_fedfunds("fedfunds", a, b),
                series("baa10y", "Moody's Baa corporate yield minus 10-year Treasury, monthly average", "percentage points", "M",
                       baa, 2, "FRED BAA10Y (daily), monthly average via FRED aggregation",
                       "FRED; Moody's / Board of Governors", "BAA10Y",
                       doc_url(fred_template("BAA10Y", observation_start="2006-01-01", observation_end="2010-12-31",
                                             frequency="m", aggregation_method="avg")),
                       "FRED server-side aggregation frequency=m, aggregation_method=avg"),
                s_krwusd("krwusd", a, b, "0000100"),
                s_base_rate("bok_rate", a, b),
            ]}


def build_rates_2022(log):
    a = "2019-01"
    b = "%04d-12" % TODAY.year
    out = [
        s_base_rate("bok_rate", a, b),
        s_kr_cpi_yoy("kr_cpi", a, b),
        series("hh_loan_rate", "Household loan rate, new loans (deposit banks, weighted average)", "% per year", "M",
               [(ym(t), v) for t, v in ecos("121Y006", "M", "201901", b.replace("-", ""), "BECBLA03")], 2,
               "%s, stat 121Y006 item BECBLA03 (가계대출, new-loan basis)" % ECOS_SRC,
               ECOS_SRC, "121Y006 (1.3.3.2.1 예금은행 대출금리, 신규취급액 기준), cycle M, item BECBLA03 가계대출",
               ecos_doc("121Y006", "M", ["BECBLA03"]), "none (as published)"),
    ]
    mort = try_optional(log, lambda: [(ym(t), v) for t, v in ecos("121Y006", "M", "201901", b.replace("-", ""), "BECBLA0302")])
    if mort:
        out.append(series(
            "mortgage_rate", "Mortgage loan rate, new loans (deposit banks, weighted average)", "% per year", "M", mort, 2,
            "%s, stat 121Y006 item BECBLA0302 (주택담보대출, new-loan basis)" % ECOS_SRC,
            ECOS_SRC, "121Y006, cycle M, item BECBLA0302 주택담보대출",
            ecos_doc("121Y006", "M", ["BECBLA0302"]), "none (as published)"))
    out += [
        s_krwusd("krwusd", a, b, "0000100"),
        s_fedfunds("fedfunds", a, b),
        s_us_cpi_yoy("us_cpi", a, b),
        s_brent("brent", a, b),
    ]
    for item, key, label in (("P63A", "house_price", "Housing sale price index, nationwide, all types (KB)"),
                             ("P63ACA", "house_price_seoul_apt", "Apartment sale price index, Seoul (KB)")):
        pts = try_optional(log, lambda item=item: [(ym(t), v) for t, v in ecos("901Y062", "M", "201901", b.replace("-", ""), item)])
        if pts:
            out.append(series(
                key, label, "index (2026-01 = 100)", "M", pts, 2,
                "%s, stat 901Y062 item %s (KB Kookmin Bank housing price survey)" % (ECOS_SRC, item),
                ECOS_SRC + " (data from KB Kookmin Bank)", "901Y062 (4.4.1.1 주택매매가격지수(KB)), cycle M, item %s" % item,
                ecos_doc("901Y062", "M", [item]),
                "none (as published; KB rebases the index periodically, so the base month may change between runs)"))
    return {"id": "rates-2022", "title": "The 2022 rate cycle, 2019 onward: Korea and the United States",
            "series": out}


# ---- OpenDART ----------------------------------------------------------------

DART_FIRMS = [  # (key, display name, stock code)
    ("samsung", "Samsung Electronics", "005930"),
    ("skhynix", "SK hynix", "000660"),
    ("hyundai", "Hyundai Motor", "005380"),
    ("posco", "POSCO Holdings", "005490"),
    ("lgchem", "LG Chem", "051910"),
]
DART_CORPCODE = "https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key={OPENDART_KEY}"
DART_FS = ("https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?crtfc_key={OPENDART_KEY}"
           "&corp_code=%s&bsns_year=%s&reprt_code=11011&fs_div=CFS")
DART_METRICS = [
    # key, label, statements, standard account ids, fallback Korean names
    ("revenue", "Revenue", ("IS", "CIS"), ("ifrs-full_Revenue",), ("매출액", "수익(매출액)", "매출", "영업수익")),
    ("op_income", "Operating income", ("IS", "CIS"), ("dart_OperatingIncomeLoss",),
     ("영업이익", "영업이익(손실)", "영업이익 (손실)")),
    ("fin_costs", "Finance costs (income statement)", ("IS", "CIS"), ("ifrs-full_FinanceCosts",), ("금융비용", "금융원가")),
    ("interest_paid", "Interest paid (cash flow statement)", ("CF",),
     ("ifrs-full_InterestPaidClassifiedAsOperatingActivities", "ifrs-full_InterestPaidClassifiedAsFinancingActivities"),
     ("이자의 지급", "이자지급", "이자의지급")),
]


def dart_amount(s):
    s = (s or "").replace(",", "").strip()
    if s in ("", "-"):
        return None
    return float(s)


def dart_pick(rows, statements, ids, names):
    """Return (value, [account labels used]) for one metric in one annual report."""
    for sj in statements:
        cand = [r for r in rows if r.get("sj_div") == sj]
        hits = [r for r in cand if r.get("account_id") in ids]
        if not hits:
            hits = [r for r in cand if r.get("account_nm", "").strip() in names]
        hits = [r for r in hits if dart_amount(r.get("thstrm_amount")) is not None]
        if hits:
            if sj == "CF":   # interest paid may be split across operating/financing classifications
                seen, total, used = set(), 0.0, []
                for r in hits:
                    tag = r["account_id"] if r["account_id"] in ids else r["account_nm"]
                    if tag in seen:
                        continue
                    seen.add(tag)
                    total += dart_amount(r["thstrm_amount"])
                    used.append("%s %s" % (r["account_id"], r["account_nm"].strip()))
                return total, used
            r = hits[0]
            return dart_amount(r["thstrm_amount"]), ["%s %s %s" % (sj, r["account_id"], r["account_nm"].strip())]
    return None, []


def build_dart(log):
    z = zipfile.ZipFile(io.BytesIO(http_get(DART_CORPCODE, raw=True)))
    root = ET.fromstring(z.read(z.namelist()[0]))
    by_stock = {}
    for e in root.iter("list"):
        sc = (e.findtext("stock_code") or "").strip()
        if sc:
            by_stock[sc] = e.findtext("corp_code").strip()
    out = []
    for fkey, fname, stock in DART_FIRMS:
        cc = by_stock.get(stock)
        if not cc:
            log.append("DART: no corp_code for %s" % fname)
            continue
        vals = {m[0]: [] for m in DART_METRICS}
        used = {m[0]: set() for m in DART_METRICS}
        for year in range(2019, TODAY.year):
            d = http_get(DART_FS % (cc, year))
            if d.get("status") == "013":          # no filing for that year (yet)
                continue
            if d.get("status") != "000":
                raise FetchError("DART %s %s: %s %s" % (fname, year, d.get("status"), d.get("message")))
            rows = d.get("list", [])
            for mkey, _, sts, ids, names in DART_METRICS:
                v, u = dart_pick(rows, sts, ids, names)
                if v is not None:
                    vals[mkey].append((str(year), v / 1e12))
                    used[mkey].update(u)
                else:
                    log.append("DART: %s %s %s not found" % (fname, year, mkey))
            time.sleep(0.2)
        for mkey, mlabel, _, _, _ in DART_METRICS:
            if not vals[mkey]:
                continue
            accts = "; ".join(sorted(used[mkey]))
            note = None
            if mkey == "interest_paid":
                note = ("Cash interest paid, a proxy for interest expense (which appears only in the notes, not as a "
                        "standard face-statement account).")
                if fkey == "hyundai":
                    note += " Includes interest paid by the group's captive-finance subsidiaries."
            elif mkey == "fin_costs":
                note = "IFRS finance costs: interest plus FX and derivative losses booked as finance costs."
            out.append(series(
                "%s.%s" % (fkey, mkey), "%s: %s" % (fname, mlabel), "KRW trillion", "A", vals[mkey], 3,
                "OpenDART fnlttSinglAcntAll, corp_code %s, consolidated (CFS), annual report (11011), accounts: %s"
                % (cc, accts),
                "OpenDART (Financial Supervisory Service)",
                "corp_code %s (stock %s), reprt_code 11011, fs_div CFS; accounts used: %s" % (cc, stock, accts),
                doc_url(DART_FS % (cc, "{YEAR}")),
                "won / 1e12 -> KRW trillion; thstrm_amount of each fiscal year's own annual report (as first reported)",
                note=note))
    if not out:
        raise FetchError("DART: nothing retrieved")
    return {"id": "dart-firms", "title": "Five Korean manufacturers: revenue, operating income, finance costs",
            "series": out}


# ---- Maddison Project Database 2023 (no key; one xlsx file) -----------------

MADDISON_URL = "https://dataverse.nl/api/access/datafile/421302"
MADDISON_SRC = "Maddison Project Database 2023 (Bolt and van Zanden, CC BY 4.0)"
MADDISON_COUNTRIES = [("GBR", "United Kingdom (England before 1700)"), ("NLD", "Netherlands"), ("ITA", "Italy"),
                      ("CHN", "China"), ("IND", "India"), ("JPN", "Japan"), ("KOR", "Korea"), ("USA", "United States")]


def xlsx_sheet_rows(blob, name):
    """Rows of one named sheet of an .xlsx, as lists of cell strings (standard library only)."""
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
    z = zipfile.ZipFile(io.BytesIO(blob))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rid = next(s.get("{%s}id" % ns["r"]) for s in wb.find("m:sheets", ns) if s.get("name") == name)
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    target = next(r.get("Target") for r in rels if r.get("Id") == rid)
    path = "xl/" + target.lstrip("/").replace("xl/", "", 1)
    strings = ["".join(t.text or "" for t in si.iter("{%s}t" % ns["m"]))
               for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns)]
    for _, el in ET.iterparse(z.open(path)):
        if el.tag == "{%s}row" % ns["m"]:
            row = {}
            for c in el.findall("m:c", ns):
                v = c.find("m:v", ns)
                val = None if v is None else v.text
                if c.get("t") == "s" and val is not None:
                    val = strings[int(val)]
                row["".join(ch for ch in c.get("r") if ch.isalpha())] = val
            yield row
            el.clear()


def build_maddison(log):
    blob = http_get(MADDISON_URL, raw=True)
    wanted = dict(MADDISON_COUNTRIES)
    gdppc = {c: [] for c in wanted}
    pop = {c: [] for c in wanted}
    for row in xlsx_sheet_rows(blob, "Full data"):
        code = row.get("A")
        if code not in wanted:
            continue
        year = int(float(row["D"]))
        if row.get("E") not in (None, ""):
            gdppc[code].append((str(year), float(row["E"])))
        if row.get("F") not in (None, ""):
            pop[code].append((str(year), float(row["F"])))
    out = []
    for code, name in MADDISON_COUNTRIES:
        out.append(series("gdppc_" + code.lower(), "%s: GDP per person" % name, "2011 international $", "A",
                          gdppc[code], 0, MADDISON_SRC + ", sheet 'Full data', gdppc",
                          MADDISON_SRC, code, MADDISON_URL, "as published; years with no estimate omitted"))
        out.append(series("pop_" + code.lower(), "%s: population" % name, "thousands", "A",
                          pop[code], 0, MADDISON_SRC + ", sheet 'Full data', pop",
                          MADDISON_SRC, code, MADDISON_URL, "as published; years with no estimate omitted"))
    return {"id": "maddison", "title": "The long run: income and population since 1250 (Maddison Project 2023)",
            "series": out}


def kosis2(org, tbl, itm, obj1, obj2, prd, start, end):
    """Rows of a KOSIS table with two classifications, as returned."""
    t = ("https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&apiKey={KOSIS_KEY}"
         "&orgId=%s&tblId=%s&itmId=%s&objL1=%s&objL2=%s&objL3=&objL4=&objL5=&objL6=&objL7=&objL8="
         "&prdSe=%s&startPrdDe=%s&endPrdDe=%s&format=json&jsonVD=Y") % (org, tbl, itm, obj1, obj2, prd, start, end)
    d = http_get(t)
    if not isinstance(d, list):
        raise FetchError("KOSIS %s: %s" % (tbl, redact(json.dumps(d, ensure_ascii=False)[:200])))
    return d, t


KOSIS_SRC = "KOSIS OpenAPI (Statistics Korea)"
HH_TBL = "DT_1L9U103"
QUINTILES = ("Q1", "Q2", "Q3", "Q4", "Q5", "Q0")


def build_korea_households(log):
    """Household Income and Expenditure Survey: disposable income and consumption by income quintile,
    for the last year with all four quarters (monthly averages per household)."""
    year = None
    got = {}
    for item in ("Y1", "F"):
        rows, t = kosis2("101", HH_TBL, "T110", "ALL", item, "Q", "%d01" % (TODAY.year - 2), "%d04" % TODAY.year)
        for r in rows:
            got.setdefault(item, {}).setdefault(r["C1"], {})[r["PRD_DE"]] = float(r["DT"])
    years = sorted({q[:4] for c in got["Y1"].values() for q in c})
    year = max(y for y in years if all(len([q for q in got[i]["Q0"] if q.startswith(y)]) == 4 for i in ("Y1", "F")))
    mean = lambda item, c: sum(v for q, v in got[item][c].items() if q.startswith(year)) / 4.0
    names = {"Q1": "bottom fifth", "Q2": "second fifth", "Q3": "middle fifth", "Q4": "fourth fifth", "Q5": "top fifth", "Q0": "all households"}
    url = doc_url(kosis_template("101", HH_TBL, "T110", "ALL", "Q", "{START}", "{END}").replace("objL2=", "objL2={ITEM}"))
    codes = "orgId 101, tblId %s (소득5분위별 가구당 가계수지, 전국 1인이상), itmId T110 전체가구, objL1 월소득 5분위 Q1..Q5, Q0 전체 평균, objL2 %%s, prdSe Q" % HH_TBL
    out = []
    for key, item, label in (("disp_income", "Y1", "Disposable income per household"), ("consumption", "F", "Consumption spending per household")):
        out.append(series(key, "%s, by income quintile (%s)" % (label, year), "thousand KRW per month", "A",
                          [(names[c], mean(item, c) / 1000.0) for c in QUINTILES], 1,
                          "%s, table %s, item %s" % (KOSIS_SRC, HH_TBL, item), KOSIS_SRC + ", orgId 101",
                          codes % ("Y1 처분가능소득" if item == "Y1" else "F 소비지출"), url,
                          "mean of the four quarters of %s (each a monthly average per household), KRW / 1000; points keyed by quintile, not time" % year))
    return {"id": "korea-households", "title": "Korean households by income quintile: disposable income and consumption (Household Income and Expenditure Survey)", "year": year, "series": out}


IO_TBL = "DT_271Y112"
IO_ITEM = "13103852764999"


def build_korea_io(log):
    """Bank of Korea input-output table, 33 sectors: the Leontief inverse (output induced in each supplying
    sector per won of final demand for each sector), for the latest year."""
    rows, t = kosis2("301", IO_TBL, IO_ITEM, "ALL", "ALL", "Y", str(TODAY.year - 4), str(TODAY.year))
    year = max(r["PRD_DE"] for r in rows)
    code = lambda s: s.split(".")[-1]
    sectors, seen, L = [], set(), {}
    for r in rows:
        if r["PRD_DE"] != year:
            continue
        j, i = code(r["C1"]), code(r["C2"])
        if j[0].isalpha() and j not in seen:
            seen.add(j)
            sectors.append({"code": j, "ko": r["C1_NM"], "en": r.get("C1_NM_ENG") or ""})
        if j[0].isalpha() and i[0].isalpha():
            L[(i, j)] = float(r["DT"])
    order = [s["code"] for s in sectors]
    if len(order) != 33 or len(L) != 33 * 33:
        raise FetchError("input-output %s: expected 33 sectors, got %d (%d cells)" % (year, len(order), len(L)))
    out = [series("leontief", "Leontief inverse, %s (domestic, producer prices, 33 sectors)" % year, "won per won of final demand", "A",
                  [("%s>%s" % (i, j), L[(i, j)]) for j in order for i in order], 5,
                  "Bank of Korea input-output tables via %s, table %s" % (KOSIS_SRC, IO_TBL), KOSIS_SRC + ", orgId 301 (Bank of Korea)",
                  "orgId 301, tblId %s (투입산출표 생산유발계수표, 생산자가격, 대분류), itmId %s, objL1 수요상품별 (column), objL2 투입상품별 (row), prdSe Y" % (IO_TBL, IO_ITEM),
                  doc_url(t), "as published; point 'i>j' is the output of sector i induced by one won of final demand for sector j; points keyed by cell, not time")]
    return {"id": "korea-io", "title": "Korea's input-output table: how a won of final demand travels through 33 sectors (Bank of Korea)", "year": year, "sectors": sectors, "series": out}


BUILDERS = [
    ("korea-growth", build_korea_growth),
    ("us-phillips", build_us_phillips),
    ("oil", build_oil),
    ("korea-1997", build_korea_1997),
    ("crisis-2008", build_crisis_2008),
    ("rates-2022", build_rates_2022),
    ("dart-firms", build_dart),
    ("maddison", build_maddison),
    ("korea-households", build_korea_households),
    ("korea-io", build_korea_io),
]


# --------------------------------------------------------------------------- output

def to_json(doc):
    head = {k: v for k, v in doc.items() if k != "series"}
    lines = [json.dumps({k: v for k, v in s.items() if k != "_doc"}, ensure_ascii=False, separators=(",", ":"))
             for s in doc["series"]]
    h = json.dumps(head, ensure_ascii=False, separators=(",", ":"))[:-1]
    return h + ',"series":[\n' + ",\n".join(lines) + "\n]}\n"


CACHE_PATH = os.path.join(HERE, ".sources-cache.json")   # outside the web-served tree


def summarize(doc):
    """What SOURCES.md needs from a built file (no data points)."""
    return {"title": doc["title"], "retrieved": doc["retrieved"],
            "series": [{"key": s["key"], "label": s["label"], "unit": s["unit"], "freq": s["freq"],
                        "note": s.get("note"), "doc": s["_doc"], "first": s["points"][0][0],
                        "last": s["points"][-1][0], "n": len(s["points"])} for s in doc["series"]]}


def load_cache():
    try:
        with open(CACHE_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def write_sources(summaries):
    L = ["# Data sources",
         "",
         "Generated by `tools/fetch_data.py` (standard-library Python). Rerun it to refresh; API keys are read from "
         "`../.env` at run time and never written here.",
         "",
         "URL templates show the API key as `{KEY}`; `{START}`/`{END}`/`{YEAR}` are period placeholders. "
         "Time keys: annual `YYYY`, monthly `YYYY-MM`, weekly `YYYY-MM-DD` (week-ending Friday). "
         "Annual means cover closed calendar years only; a year with a missing month is flagged in its note.",
         ""]
    for fid in [b[0] for b in BUILDERS]:
        sm = summaries.get(fid)
        if not sm:
            continue
        L += ["## %s.json" % fid, "", "%s. Retrieved %s." % (sm["title"], sm["retrieved"]), ""]
        for s in sm["series"]:
            d = s["doc"]
            L += ["### `%s` - %s" % (s["key"], s["label"]),
                  "",
                  "- Provider: %s" % d["provider"],
                  "- Codes: %s" % d["codes"],
                  "- URL: `%s`" % d["url"],
                  "- Unit / frequency: %s / %s" % (s["unit"], s["freq"]),
                  "- Coverage: %s to %s (%d points)" % (s["first"], s["last"], s["n"]),
                  "- Transformation: %s" % d["transform"],
                  "- Retrieved: %s" % sm["retrieved"]]
            if s.get("note"):
                L.append("- Note: %s" % s["note"])
            L.append("")
    with open(os.path.join(OUT_DIR, "SOURCES.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L))


# --------------------------------------------------------------------------- checks

def sanity_checks():
    def get(fid, key):
        try:
            with open(os.path.join(OUT_DIR, fid + ".json"), encoding="utf-8") as f:
                doc = json.load(f)
        except (OSError, ValueError):
            return None
        for s in doc["series"]:
            if s["key"] == key:
                return dict((t, v) for t, v in s["points"])
        return None

    res = []

    def check(name, ok, detail):
        res.append(("PASS" if ok else "FLAG", name, detail))

    fx = get("korea-1997", "krwusd")
    if fx:
        v = fx.get("1997-12")
        check("KRW/USD Dec-1997 monthly avg in 1400-1500", v is not None and 1400 <= v <= 1500, "1997-12 = %s" % v)
    cr = get("korea-1997", "callrate")
    if cr:
        v = max(cr.get("1997-12", 0), cr.get("1998-01", 0))
        check("Call rate > 25% in Dec-1997/Jan-1998 (monthly avg)", v > 25,
              "1997-12 = %s, 1998-01 = %s" % (cr.get("1997-12"), cr.get("1998-01")))
    u = get("us-phillips", "unrate")
    if u:
        check("US unemployment 1982 ~ 9.7", u.get("1982") is not None and abs(u["1982"] - 9.7) <= 0.1, "1982 = %s" % u.get("1982"))
    pi = get("us-phillips", "cpi_infl")
    if pi:
        check("US CPI inflation 1980 ~ 13.5", pi.get("1980") is not None and abs(pi["1980"] - 13.5) <= 0.2, "1980 = %s" % pi.get("1980"))
    for key in ("ted", "ted_w"):
        t = get("crisis-2008", key)
        if t:
            peak = max(t, key=t.get)
            check("TED spread (%s) peaks in Oct-2008" % key, peak.startswith("2008-10"), "peak %s = %s" % (peak, t[peak]))
    br = get("rates-2022", "bok_rate")
    if br:
        low = [br[m] for m in br if "2020-05" <= m <= "2021-07"]
        check("BOK base rate 0.5% May-2020..Jul-2021", bool(low) and all(v == 0.5 for v in low),
              "values %s" % sorted(set(low)))
        hi = [br[m] for m in br if "2023-01" <= m <= "2024-09"]
        check("BOK base rate 3.5% Jan-2023..Sep-2024", bool(hi) and all(v == 3.5 for v in hi),
              "values %s" % sorted(set(hi)))
    ff = get("rates-2022", "fedfunds")
    if ff:
        late = [ff[m] for m in ("2023-09", "2023-10", "2023-11", "2023-12") if m in ff]
        check("Fed funds ~5.3% late 2023", bool(late) and all(5.2 <= v <= 5.4 for v in late), "Sep-Dec 2023 = %s" % late)
    w = get("oil", "wti")
    if w:
        peak = max((m for m in w if m.startswith("2008")), key=w.get)
        check("WTI 2008 monthly peak Jun/Jul-2008 (~133)", peak in ("2008-06", "2008-07") and 125 <= w[peak] <= 140,
              "%s = %s" % (peak, w[peak]))
    g = get("korea-growth", "rgdp")
    if g and "1998" in g:
        gr = (g["1998"] / g["1997"] - 1) * 100
        check("Korea real GDP 1998 contraction ~ -5%", -6.5 <= gr <= -4.0, "1998 growth = %.2f%%" % gr)
    return res


# --------------------------------------------------------------------------- main

def main(argv):
    global ENV
    if not os.path.exists(ENV_PATH):
        sys.exit("missing %s" % ENV_PATH)
    ENV = load_env(ENV_PATH)
    os.makedirs(OUT_DIR, exist_ok=True)
    wanted = set(a.replace(".json", "") for a in argv[1:]) or None
    unknown = (wanted or set()) - set(b[0] for b in BUILDERS)
    if unknown:
        sys.exit("unknown file id(s): %s" % ", ".join(sorted(unknown)))

    summaries, failed = load_cache(), []
    for fid, fn in BUILDERS:
        if wanted and fid not in wanted:
            continue
        log = []
        try:
            doc = fn(log)
        except Exception as e:  # noqa: BLE001
            failed.append(fid)
            print("[fail] %s.json kept as is: %s" % (fid, redact(e)))
            continue
        doc["retrieved"] = TODAY.isoformat()
        text = to_json(doc)
        with open(os.path.join(OUT_DIR, fid + ".json"), "w", encoding="utf-8") as f:
            f.write(text)
        summaries[fid] = summarize(doc)
        print("[ok]   %s.json  %5.1f KB" % (fid, len(text.encode("utf-8")) / 1024.0))
        for s in doc["series"]:
            p = s["points"]
            print("         %-28s %s..%s  n=%d" % (s["key"], p[0][0], p[-1][0], len(p)))
        for line in log:
            print("         ! " + redact(line))

    summaries = {k: v for k, v in summaries.items() if os.path.exists(os.path.join(OUT_DIR, k + ".json"))}
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(summaries, f, ensure_ascii=False, indent=1)
    write_sources(summaries)
    print("[ok]   SOURCES.md")
    print("\nSanity checks:")
    for status, name, detail in sanity_checks():
        print("  %s  %s: %s" % (status, name, detail))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
