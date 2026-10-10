/* StoryLLM — shared client for the v3 proxy (../server.py).
 * Handles: remote (TensorMux) vs local (ollama) modes, latency measurement,
 * resilient JSON extraction, resource-guard waiting, and an offline canned
 * fallback so the demo can never hard-fail on stage.
 *
 *   const llm = new StoryLLM();
 *   const gm = await llm.next({ goal, history, playerText, hero });
 *   // -> {narrative, obstacles, scene_seed, props, did_you_mean, choices,
 *   //     goal_progress, success, _meta:{ms, mode, source}}
 */
(function () {
  const SYS = `You are a reactive game master for a gentle kids' story game (ages 5-8) called "Pip & the Storywood". The story is "The Three Little Pigs": three pig friends must gather materials, build houses, and reach the strong brick house before the Big Bad Wolf huffs and puffs. The kid draws their own hero and types short words/phrases to act.

Rules:
- Reply with ONLY minified JSON, no markdown fences, no prose.
- Keep every sentence short, warm, funny, and kid-safe. Never scary-violent: the wolf is sneaky and huffy, not harmful.
- The kid's typed word is an ATTEMPT. If it is sensible, accept it and advance the story. If it is silly, let it happen comedically (the thing appears and the hero slips/bonks/splats — then dusts off).
- If the input is ambiguous or a near-miss spelling, put the intended word in "did_you_mean".
- scene_seed drives a procedural sketch renderer: pick a biome, a palette, an integer seed, and a list of prop kinds to draw.
- props[] entries are things to spawn/react: {"kind": "<single word>", "action": "spawn|remove|react", "x": <0.0-1.0 left-to-right>}.
- goal_progress is 0.0-1.0 toward reaching the brick house safe.

JSON shape (all fields required):
{"narrative":"<1-2 kid sentences>","obstacles":["<short problem>",...],"scene_seed":{"biome":"meadow|rain|river|cave|village|forest|storm","seed":<int>,"palette":"warm|cool|dusk|night","props":["<propkind>",...]},"props":[{"kind":"<word>","action":"spawn|remove|react","x":<0-1>}],"did_you_mean":null,"choices":["<2-4 short next-thing hints>"],"goal_progress":<0-1>,"success":<true|false>}`;

  function extractJSON(text) {
    if (!text) return null;
    let t = String(text).trim()
      .replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const s = t.indexOf("{"), e = t.lastIndexOf("}");
    if (s === -1 || e <= s) return null;
    try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; }
  }

  function normGM(raw) {
    if (!raw) return null;
    const ss = raw.scene_seed || {};
    return {
      narrative: String(raw.narrative || "").slice(0, 400),
      obstacles: Array.isArray(raw.obstacles) ? raw.obstacles.map(String).slice(0, 4) : [],
      scene_seed: {
        biome: String(ss.biome || "meadow"),
        seed: (ss.seed | 0) || Math.floor(Math.random() * 1e6),
        palette: String(ss.palette || "warm"),
        props: Array.isArray(ss.props) ? ss.props.map(String).slice(0, 10) : [],
      },
      props: Array.isArray(raw.props) ? raw.props.filter(p => p && p.kind).map(p => ({
        kind: String(p.kind), action: String(p.action || "spawn"),
        x: Math.max(0, Math.min(1, Number(p.x) || 0.5)),
      })).slice(0, 8) : [],
      did_you_mean: raw.did_you_mean ? String(raw.did_you_mean) : null,
      choices: Array.isArray(raw.choices) ? raw.choices.map(String).slice(0, 4) : [],
      goal_progress: Math.max(0, Math.min(1, Number(raw.goal_progress) || 0)),
      success: raw.success !== false,
    };
  }

  // Tiny offline narrator — last-ditch so the stage demo can never die.
  const OFF = {
    beat(gm, ctx) {
      const biomes = ["meadow", "forest", "river", "village", "storm"];
      const w = (ctx.playerText || "walk").toLowerCase().trim();
      const silly = /banana|peel|toaster|slime|homework|sock|fridge|jelly|mud/.test(w);
      const noun = w.split(/\s+/).pop() || "bridge";
      const i = ((ctx.history || []).length) % biomes.length;
      return {
        narrative: silly
          ? `A ${noun} appears — of course! ${ctx.hero || "Pip"} slips, spins, and lands flat. Everyone giggles.`
          : `The ${noun} appears right where it is needed. ${ctx.hero || "Pip"} hurries onward with a grin.`,
        obstacles: silly ? ["a very slippery spot"] : ["the wolf is getting closer"],
        scene_seed: { biome: biomes[i], seed: 1000 + i * 77, palette: i > 2 ? "dusk" : "warm", props: [noun] },
        props: [{ kind: noun, action: "spawn", x: 0.6 }],
        did_you_mean: null,
        choices: silly ? ["dust off", "try again"] : ["keep going", "build faster"],
        goal_progress: Math.min(0.95, ((ctx.history || []).length + 1) / 6),
        success: !silly,
      };
    }
  };

  class StoryLLM {
    constructor(opts = {}) {
      this.mode = opts.mode || "remote";           // "remote" | "local" | "auto"
      this.maxTokens = opts.maxTokens || 380;
      this.timeoutMs = opts.timeoutMs || 25000;
      this.lastMs = null; this.lastSource = null;
      this.onStatus = opts.onStatus || (() => {});
    }

    async sysguard() {
      try {
        const r = await fetch("/api/sysguard");
        return await r.json();
      } catch { return { ok: false }; }
    }

    /* Wait until the machine has headroom. neededGB: how much free RAM the
     * caller is about to need. Resolves true when OK, false on timeout.
     * The SPEC rule: never start a >13GB-ish load without headroom. */
    async waitForHeadroom(neededGB = 4, timeoutMs = 20000) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        const g = await this.sysguard();
        if (g.ok && (g.mem_avail_gb == null || g.mem_avail_gb > neededGB)) return true;
        this.onStatus({ waiting: true, free: g.mem_avail_gb });
        await new Promise(r => setTimeout(r, 1500));
      }
      return false;
    }

    async chat(messages, mode) {
      const url = "/api/chat" + (mode === "local" ? "?mode=local" : "");
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), this.timeoutMs);
      const t0 = performance.now();
      try {
        const r = await fetch(url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, max_tokens: this.maxTokens,
                                 reasoning_effort: "none" }),
          signal: ctl.signal,
        });
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error || `http ${r.status}`);
        this.lastMs = j.ms ?? Math.round(performance.now() - t0);
        return j.data;
      } finally { clearTimeout(to); }
    }

    async next(ctx) {
      const user = [
        `GOAL: ${ctx.goal}`,
        ctx.hero ? `HERO (kid-made): ${ctx.hero}` : null,
        `STORY SO FAR: ${(ctx.history || []).slice(-4).join(" | ") || "just starting"}`,
        `KID TYPED: "${ctx.playerText}"`,
      ].filter(Boolean).join("\n");
      const messages = [
        { role: "system", content: SYS },
        { role: "user", content: user },
      ];

      const order = this.mode === "auto" ? ["remote", "local"]
                                       : [this.mode === "local" ? "local" : "remote"];
      for (const m of order) {
        try {
          this.onStatus({ mode: m, waiting: false });
          const data = await this.chat(messages, m);
          const raw = extractJSON(data?.choices?.[0]?.message?.content);
          const gm = normGM(raw);
          if (gm) {
            this.lastSource = m;
            gm._meta = { ms: this.lastMs, mode: m, source: m };
            return gm;
          }
        } catch (e) { this.onStatus({ mode: m, failed: String(e).slice(0, 80) }); }
      }
      // offline fallback — the demo never dies
      const gm = normGM(OFF.beat(null, ctx));
      gm._meta = { ms: 0, mode: "offline", source: "offline" };
      this.lastSource = "offline";
      return gm;
    }
  }

  window.StoryLLM = StoryLLM;
})();
