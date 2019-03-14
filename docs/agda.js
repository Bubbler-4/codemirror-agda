(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('codemirror')) :
  typeof define === 'function' && define.amd ? define(['codemirror'], factory) :
  (global = global || self, factory(global.CodeMirror));
}(this, function (CodeMirror) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // Requires addon/mode/simple.js

  const floatRegex = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?(?=[.;{}()@"\s]|$)/u;
  const integerRegex = /-?(?:0|[1-9]\d*|0x[0-9A-Fa-f]+)(?=[.;{}()@"\s]|$)/u;

  const keywordsRegex = new RegExp(
    "(?:[_=|→:?\\\\λ∀]|->|\\.{2,3}|abstract|codata|coinductive|constructor|" +
      "data|do|eta-equality|field|forall|hiding|import|in|inductive|" +
      "infix|infixl|infixr|instance|let|macro|module|mutual|no-eta-equality|" +
      "open|overlap|pattern|postulate|primitive|private|public|quote|" +
      "quoteContext|quoteGoal|quoteTerm|record|renaming|rewrite|" +
      "syntax|tactic|unquote|unquoteDecl|unquoteDef|using|where|with|" +
      'Set(?:\\d+|[₀₁₂₃₄₅₆₇₈₉]+)?)(?=[.;{}()@"\\s]|$)',
    "u"
  );

  const escapeDec = "0|[1-9]\\d*";
  const escapeHex = "x(?:0|[1-9A-Fa-f][0-9A-Fa-f]*)";
  const escapeCode =
    "[abtnvf&\\\\'\"]|NUL|SOH|STX|ETX|EOT|ENQ|ACK|BEL|BS|HT|LF|VT|FF|CR|" +
    "SO|SI|DLE|DC[1-4]|NAK|SYN|ETB|CAN|EM|SUB|ESC|FS|GS|RS|US|SP|DEL";
  const escapeChar = new RegExp(
    "\\\\(?:" + escapeDec + "|" + escapeHex + "|" + escapeCode + ")",
    "u"
  );

  const startState = [
    // comments, pragmas, holes
    { regex: /\{-#.*?#-\}/u, token: "meta" },
    { regex: /\{-/u, token: "comment", push: "comment" },
    { regex: /\{!/u, token: "keyword", push: "hole" },
    { regex: /--.*/u, token: "comment" },

    // literals
    { regex: floatRegex, token: "number" },
    { regex: integerRegex, token: "integer" },
    { regex: /'/u, token: "string", push: "charLit" },
    { regex: /"/u, token: "string", push: "strLit" },

    // keywords & qualified names
    { regex: keywordsRegex, token: "keyword" },
    { regex: /[^\s.;{}()@"]+\./u, token: "qualifier" },
    { regex: /[^\s.;{}()@"]+/u, token: null },
  ];

  const commentState = [
    { regex: /\{-/u, token: "comment", push: "comment" },
    { regex: /-\}/u, token: "comment", pop: true },
    { regex: /./u, token: "comment" },
  ];

  const holeState = [
    { regex: /\{!/u, token: "keyword", push: "hole" },
    { regex: /!\}/u, token: "keyword", pop: true },
    { regex: /./u, token: "comment" },
  ];

  const charLitState = [
    { regex: /'/u, token: "string error", pop: true },
    { regex: /[^'\\]/u, token: "string", next: "charLitEnd" },
    { regex: escapeChar, token: "string", next: "charLitEnd" },
    { regex: /./u, token: "string error" },
  ];

  const charLitEndState = [
    { regex: /'/u, token: "string", pop: true },
    { regex: /./u, token: "string error" },
    { regex: /[^]/u, token: "string error", pop: true },
  ];

  const stringState = [
    { regex: /"/u, token: "string", pop: true },
    { regex: /[^"\\]/u, token: "string" },
    { regex: escapeChar, token: "string" },
    { regex: /./u, token: "string error" },
  ];

  CodeMirror.defineSimpleMode("agda", {
    start: startState,
    comment: commentState,
    hole: holeState,
    charLit: charLitState,
    charLitEnd: charLitEndState,
    strLit: stringState,
  });
  CodeMirror.defineMIME("text/x-agda", "agda");

  const cmObj = (k, v) => ({
    text: "\\" + k,
    symbol: v,
    displayText: `${v} \\${k}`,
    hint: null,
  });

  const toTable = pairs =>
    pairs.reduce((a, p) => {
      a.push.apply(
        a,
        Array.from(p[1].replace(/\s/g, "")).map(v => cmObj(p[0], v))
      );
      return a;
    }, []);

  // Subset of agda-input-translations + TeX-Input
  // TODO Add some more from TeX-Input
  // https://github.com/agda/agda/blob/master/src/data/emacs-mode/agda-input.el#L191
  const translations = toTable([
    ["ell", "ℓ"],
    // Equality and similar symbols.
    ["eq", "=∼∽≈≋∻∾∿≀≃⋍≂≅ ≌≊≡≣≐≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟≍≎≏≬⋕"],
    ["eqn", "≠≁ ≉     ≄  ≇≆  ≢                 ≭    "],
    ["=", "="],
    ["=n", "≠"],
    ["~", "∼"],
    ["~n", "≁"],
    ["~~", "≈"],
    ["~~n", "≉"],

    // ["~~~", "≋"],
    // [":~", "∻"],
    ["~-", "≃"],
    ["~-n", "≄"],
    ["-~", "≂"],
    ["~=", "≅"],
    ["~=n", "≇"],
    ["~~-", "≊"],
    ["==", "≡"],
    ["==n", "≢"],
    // ["===", "≣"],
    // [".=", "≐"],
    // [".=.", "≑"],
    // [":=", "≔"],
    // ["=:", "≕"],
    // ["=o", "≗"],
    // ["(=", "≘"],
    // ["and=", "≙"],
    // ["or=", "≚"],
    // ["*=", "≛"],
    // ["t=", "≜"],
    // ["def=", "≝"],
    // ["m=", "≞"],
    // ["?=", "≟"],

    // Inequality and similar symbols.
    ["leq", "<≪⋘≤≦≲ ≶≺≼≾⊂⊆ ⋐⊏⊑ ⊰⊲⊴⋖⋚⋜⋞"],
    ["leqn", "≮  ≰≨≴⋦≸⊀ ⋨⊄⊈⊊  ⋢⋤ ⋪⋬   ⋠"],
    ["geq", ">≫⋙≥≧≳ ≷≻≽≿⊃⊇ ⋑⊐⊒ ⊱⊳⊵⋗⋛⋝⋟"],
    ["geqn", "≯  ≱≩≵⋧≹⊁ ⋩⊅⊉⊋  ⋣⋥ ⋫⋭   ⋡"],
    ["<=", "≤"],
    [">=", "≥"],
    ["<=n", "≰"],
    [">=n", "≱"],
    ["le", "≤"],
    ["ge", "≥"],
    ["len", "≰"],
    ["gen", "≱"],
    ["<n", "≮"],
    [">n", "≯"],
    ["<~", "≲"],
    [">~", "≳"],
    // ["<~n", "⋦"],
    // [">~n", "⋧"],
    // ["<~nn", "≴"],
    // [">~nn", "≵"],
    ["sub", "⊂"],
    ["sup", "⊃"],
    ["subn", "⊄"],
    ["supn", "⊅"],
    ["sub=", "⊆"],
    ["sup=", "⊇"],
    ["sub=n", "⊈"],
    ["sup=n", "⊉"],
    // ["squb", "⊏"],
    // ["squp", "⊐"],
    // ["squb=", "⊑"],
    // ["squp=", "⊒"],
    // ["squb=n", "⋢"],
    // ["squp=n", "⋣"],

    // Set membership etc.
    // ["member", "∈∉∊∋∌∍⋲⋳⋴⋵⋶⋷⋸⋹⋺⋻⋼⋽⋾⋿"],
    ["in", "∈"],
    ["inn", "∉"],
    ["ni", "∋"],
    ["nin", "∌"],

    // Intersections, unions etc.
    // ["intersection", "∩⋂∧⋀⋏⨇⊓⨅⋒∏ ⊼      ⨉"],
    // ["union", "∪⋃∨⋁⋎⨈⊔⨆⋓∐⨿⊽⊻⊍⨃⊎⨄⊌∑⅀"],

    ["and", "∧"],
    ["or", "∨"],
    ["And", "⋀"],
    ["Or", "⋁"],
    // ["i", "∩"],
    // ["un", "∪"],
    // ["u+", "⊎"],
    // ["u.", "⊍"],
    // ["I", "⋂"],
    // ["Un", "⋃"],
    // ["U+", "⨄"],
    // ["U.", "⨃"],
    ["glb", "⊓"],
    ["lub", "⊔"],
    // ["Glb", "⨅"],
    // ["Lub", "⨆"],

    // Entailment etc.
    // ["entails", "⊢⊣⊤⊥⊦⊧⊨⊩⊪⊫⊬⊭⊮⊯"],
    ["|-", "⊢"],
    ["vdash", "⊢"],
    // ["|-n", "⊬"],
    // ["-|", "⊣"],
    // ["|=", "⊨"],
    // ["|=n", "⊭"],
    // ["||-", "⊩"],
    // ["||-n", "⊮"],
    // ["||=", "⊫"],
    // ["||=n", "⊯"],
    // ["|||-", "⊪"],

    // Divisibility, parallelity.
    ["|", "∣"],
    ["|n", "∤"],
    ["||", "∥"],
    ["||n", "∦"],

    // Some symbols from logic and set theory.
    ["all", "∀"],
    ["ex", "∃"],
    ["exn", "∄"],
    ["0", "∅"],
    ["C", "∁"],

    // Corners, ceilings and floors.
    // ["c", "⌜⌝⌞⌟⌈⌉⌊⌋"],
    // ["cu", "⌜⌝  ⌈⌉  "],
    // ["cl", "  ⌞⌟  ⌊⌋"],
    // ["cul", "⌜"],
    // ["cuL", "⌈"],
    // ["cur", "⌝"],
    // ["cuR", "⌉"],
    // ["cll", "⌞"],
    // ["clL", "⌊"],
    // ["clr", "⌟"],
    // ["clR", "⌋"],

    // Various operators/symbols.
    // ["qed", "∎"],
    ["x", "×"],
    ["o", "∘"],
    ["comp", "∘"],
    [".", "∙"],
    ["*", "⋆"],
    // [".+", "∔"],
    // [".-", "∸"],
    // [":", "∶⦂ː꞉˸፥፦：﹕︓"],
    // [",", "ʻ،⸲⸴⹁⹉、︐︑﹐﹑，､"],
    // [";", "؛⁏፤꛶；︔﹔⍮⸵;"],
    ["::", "∷"],
    // ["::-", "∺"],
    // ["-:", "∹"],
    // ["+ ", "⊹"],
    // ["surd3", "∛"],
    // ["surd4", "∜"],
    // ["increment", "∆"],
    ["inf", "∞"],
    // ["&", "⅋"],
    ["top", "⊤"],
    ["bot", "⊥"],

    // Circled operators.
    // ["o+", "⊕"],
    // ["o--", "⊖"],
    // ["ox", "⊗"],
    // ["o/", "⊘"],
    // ["o.", "⊙"],
    // ["oo", "⊚"],
    // ["o*", "⊛"],
    // ["o=", "⊜"],
    // ["o-", "⊝"],
    // ["O+", "⨁"],
    // ["Ox", "⨂"],
    // ["O.", "⨀"],
    // ["O*", "⍟"],

    // Boxed operators.
    // ["b+", "⊞"],
    // ["b-", "⊟"],
    // ["bx", "⊠"],
    // ["b.", "⊡"],

    // Various symbols.
    // ["integral", "∫∬∭∮∯∰∱∲∳"],
    // ["angle", "∟∡∢⊾⊿"],
    // ["join", "⋈⋉⋊⋋⋌⨝⟕⟖⟗"],

    // Arrows.
    // ["l", "←⇐⇚⇇⇆↤⇦↞↼↽⇠⇺↜⇽⟵⟸↚⇍⇷ ↹     ↢↩↫⇋⇜⇤⟻⟽⤆↶↺⟲ "],
    // ["r", "→⇒⇛⇉⇄↦⇨↠⇀⇁⇢⇻↝⇾⟶⟹↛⇏⇸⇶ ↴    ↣↪↬⇌⇝⇥⟼⟾⤇↷↻⟳⇰⇴⟴⟿ ➵➸➙➔➛➜➝➞➟➠➡➢➣➤➧➨➩➪➫➬➭➮➯➱➲➳➺➻➼➽➾⊸"],
    // ["u", "↑⇑⟰⇈⇅↥⇧↟↿↾⇡⇞          ↰↱➦ ⇪⇫⇬⇭⇮⇯                                           "],
    // ["d", "↓⇓⟱⇊⇵↧⇩↡⇃⇂⇣⇟         ↵↲↳➥ ↯                                                "],
    // ["ud", "↕⇕   ↨⇳                                                                    "],
    // ["lr", "↔⇔         ⇼↭⇿⟷⟺↮⇎⇹                                                        "],
    // ["ul", "↖⇖                        ⇱↸                                               "],
    // ["ur", "↗⇗                                         ➶➹➚                             "],
    // ["dr", "↘⇘                        ⇲                ➴➷➘                             "],
    // ["dl", "↙⇙                                                                         "],
    ["l-", "←"],
    ["<-", "←"],
    ["l=", "⇐"],
    ["r-", "→"],
    ["->", "→"],
    ["r=", "⇒"],
    ["=>", "⇒"],
    // ["u-", "↑"], ["u=", "⇑"],
    // ["d-", "↓"], ["d=", "⇓"],
    // ["ud-", "↕"], ["ud=", "⇕"],
    ["lr-", "↔"],
    ["<->", "↔"],
    // ["lr=", "⇔"],
    ["<=>", "⇔"],
    // ["ul-", "↖"], ["ul=", "⇖"],
    // ["ur-", "↗"], ["ur=", "⇗"],
    // ["dr-", "↘"], ["dr=", "⇘"],
    // ["dl-", "↙"], ["dl=", "⇙"],

    // ["l==", "⇚"],
    // ["l-2", "⇇"],
    ["l-r-", "⇆"],
    // ["r==", "⇛"],
    // ["r-2", "⇉"],
    // ["r-3", "⇶"],
    // ["r-l-", "⇄"],
    // ["u==", "⟰"],
    // ["u-2", "⇈"],
    // ["u-d-", "⇅"],
    // ["d==", "⟱"],
    // ["d-2", "⇊"],
    // ["d-u-", "⇵"],

    // ["l--", "⟵"],
    // ["<--", "⟵"],
    // ["l~", "↜⇜"],
    // ["r--", "⟶"],
    // ["-->", "⟶"],
    // ["r~", "↝⇝⟿"],
    // ["lr--", "⟷"],
    // ["<-->", "⟷"],
    // ["lr~", "↭"],

    // ["l-n", "↚"],
    // ["<-n", "↚"],
    // ["l=n", "⇍"],
    // ["r-n", "↛"],
    // ["->n", "↛"],
    // ["r=n", "⇏"],
    // ["=>n", "⇏"],
    // ["lr-n", "↮"],
    // ["<->n", "↮"],
    // ["lr=n", "⇎"],
    // ["<=>n", "⇎"],

    // ["l-|", "↤"],
    // ["ll-", "↞"],
    ["r-|", "↦"],
    ["mapsto", "↦"],
    // ["rr-", "↠"],
    // ["u-|", "↥"],
    // ["uu-", "↟"],
    // ["d-|", "↧"],
    // ["dd-", "↡"],
    // ["ud-|", "↨"],

    // ["l->", "↢"],
    // ["r->", "↣"],

    // ["r-o", "⊸"],
    // ["-o", "⊸"],

    // ["dz", "↯"],

    // Ellipsis.
    ["...", "⋯⋮⋰⋱"],

    // Box-drawing characters.
    // ["---", "─│┌┐└┘├┤┬┼┴╴╵╶╷╭╮╯╰╱╲╳"],
    // ["--=", "═║╔╗╚╝╠╣╦╬╩     ╒╕╘╛╞╡╤╪╧ ╓╖╙╜╟╢╥╫╨"],
    // ["--_", "━┃┏┓┗┛┣┫┳╋┻╸╹╺╻ ┍┯┑┕┷┙┝┿┥┎┰┒┖┸┚┠╂┨┞╀┦┟╁┧┢╈┪┡╇┩ ┮┭┶┵┾┽┲┱┺┹╊╉╆╅╄╃ ╿╽╼╾"],
    // ["--.", "╌╎┄┆┈┊ ╍╏┅┇┉┋"],

    // Triangles.
    // Big/small, black/white.
    // ["t", "◂◃◄◅▸▹►▻▴▵▾▿◢◿◣◺◤◸◥◹"],
    // ["T", "◀◁▶▷▲△▼▽◬◭◮"],
    // ["tb", "◂▸▴▾◄►◢◣◤◥"],
    // ["tw", "◃▹▵▿◅▻◿◺◸◹"],
    // ["Tb", "◀▶▲▼"],
    // ["Tw", "◁▷△▽"],

    // Squares.
    // ["sq", "■□◼◻◾◽▣▢▤▥▦▧▨▩◧◨◩◪◫◰◱◲◳"],
    // ["sqb", "■◼◾"],
    // ["sqw", "□◻◽"],
    // ["sq.", "▣"],
    // ["sqo", "▢"],

    // Rectangles.
    // ["re", "▬▭▮▯"],
    // ["reb", "▬▮"],
    // ["rew", "▭▯"],

    // Parallelograms.
    // ["pa", "▰▱"],
    // ["pab", "▰"],
    // ["paw", "▱"],

    // Diamonds.
    // ["di", "◆◇◈"],
    // ["dib", "◆"],
    // ["diw", "◇"],
    // ["di.", "◈"],

    // Circles.
    // ["ci", "●○◎◌◯◍◐◑◒◓◔◕◖◗◠◡◴◵◶◷⚆⚇⚈⚉"],
    // ["cib", "●"],
    // ["ciw", "○"],
    // ["ci.", "◎"],
    // ["ci..", "◌"],
    // ["ciO", "◯"],

    // Stars.
    // ["st", "⋆✦✧✶✴✹ ★☆✪✫✯✰✵✷✸"],
    // ["st4", "✦✧"],
    // ["st6", "✶"],
    // ["st8", "✴"],
    // ["st12", "✹"],

    // Blackboard bold letters.
    // ["bA", "𝔸"], ["bB", "𝔹"], ["bC", "ℂ"], ["bD", "𝔻"],
    // ["bE", "𝔼"], ["bF", "𝔽"], ["bG", "𝔾"], ["bH", "ℍ"],
    // ["bI", "𝕀"], ["bJ", "𝕁"], ["bK", "𝕂"], ["bL", "𝕃"],
    // ["bM", "𝕄"],
    ["bN", "ℕ"],
    // ["bO", "𝕆"],
    // ["bP", "ℙ"],
    // ["bQ", "ℚ"], ["bR", "ℝ"], ["bS", "𝕊"], ["bT", "𝕋"],
    // ["bU", "𝕌"], ["bV", "𝕍"], ["bW", "𝕎"], ["bX", "𝕏"],
    // ["bY", "𝕐"],
    ["bZ", "ℤ"],
    // ["bGG", "ℾ"], ["bGP", "ℿ"], ["bGS", "⅀"],
    // ["ba", "𝕒"], ["bb", "𝕓"], ["bc", "𝕔"], ["bd", "𝕕"],
    // ["be", "𝕖"], ["bf", "𝕗"], ["bg", "𝕘"], ["bh", "𝕙"],
    // ["bi", "𝕚"], ["bj", "𝕛"], ["bk", "𝕜"], ["bl", "𝕝"],
    // ["bm", "𝕞"], ["bn", "𝕟"], ["bo", "𝕠"], ["bp", "𝕡"],
    // ["bq", "𝕢"], ["br", "𝕣"], ["bs", "𝕤"], ["bt", "𝕥"],
    // ["bu", "𝕦"], ["bv", "𝕧"], ["bw", "𝕨"], ["bx", "𝕩"],
    // ["by", "𝕪"], ["bz", "𝕫"],
    // ["bGg", "ℽ"], ["bGp", "ℼ"],

    // Blackboard bold numbers.
    // ["b0", "𝟘"],
    // ["b1", "𝟙"], ["b2", "𝟚"], ["b3", "𝟛"],
    // ["b4", "𝟜"], ["b5", "𝟝"], ["b6", "𝟞"],
    // ["b7", "𝟟"], ["b8", "𝟠"], ["b9", "𝟡"],

    // Mathematical bold digits.
    // ["B0", "𝟎"],
    // ["B1", "𝟏"], ["B2", "𝟐"], ["B3", "𝟑"],
    // ["B4", "𝟒"], ["B5", "𝟓"], ["B6", "𝟔"],
    // ["B7", "𝟕"], ["B8", "𝟖"], ["B9", "𝟗"],

    // Parentheses.
    ["(", "([{⁅⁽₍〈⎴⟅⟦⟨⟪⦃〈《「『【〔〖〚︵︷︹︻︽︿﹁﹃﹙﹛﹝（［｛｢"],
    [")", ")]}⁆⁾₎〉⎵⟆⟧⟩⟫⦄〉》」』】〕〗〛︶︸︺︼︾﹀﹂﹄﹚﹜﹞）］｝｣"],
    ["[[", "⟦"],
    ["]]", "⟧"],
    ["<", "⟨"],
    [">", "⟩"],
    ["<<", "⟪"],
    [">>", "⟫"],
    ["{{", "⦃"],
    ["}}", "⦄"],

    // ["(b", "⟅"],
    // [")b", "⟆"],
    // ["lbag", "⟅"],
    // ["rbag", "⟆"],
    // ["(|", "⦇"], // Idiom brackets
    // ["|)", "⦈"],
    // ["((", "⦅"], // Banana brackets
    // ["))", "⦆"],

    // Primes.
    ["'", "′″‴⁗"],
    ["'1", "′"],
    ["`", "‵‶‷"],

    // Fractions.
    // ["frac", "¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞⅟"],

    // Bullets.
    // ["bu", "•◦‣⁌⁍"],
    // ["bub", "•"],
    // ["buw", "◦"],
    // ["but", "‣"],

    // Musical symbols.
    // ["note", "♩♪♫♬"],
    ["b", "♭"],
    ["#", "♯"],

    // Other punctuation and symbols.
    ["\\", "\\"],
    // ["en", "–"],
    // ["em", "—"],
    // ["!!", "‼"],
    // ["??", "⁇"],
    // ["?!", "‽⁈"],
    // ["!?", "⁉"],
    // ["die", "⚀⚁⚂⚃⚄⚅"],
    // ["asterisk", "⁎⁑⁂✢✣✤✥✱✲✳✺✻✼✽❃❉❊❋"],
    // ["8<", "✂✄"],
    // ["tie", "⁀"],
    // ["undertie", "‿"],
    // ["apl", "⌶⌷⌸⌹⌺⌻⌼⌽⌾⌿⍀⍁⍂⍃⍄⍅⍆⍇⍈ ⍉⍊⍋⍌⍍⍎⍏⍐⍑⍒⍓⍔⍕⍖⍗⍘⍙⍚⍛ ⍜⍝⍞⍟⍠⍡⍢⍣⍤⍥⍦⍧⍨⍩⍪⍫⍬⍭⍮ ⍯⍰⍱⍲⍳⍴⍵⍶⍷⍸⍹⍺⎕"],

    // Some combining characters.
    //
    // The following combining characters also have (other)
    // translations:
    // ̀ ́ ̂ ̃ ̄ ̆ ̇ ̈ ̋ ̌ ̣ ̧ ̱
    // ["^--" , "̅̿"],
    // ["_--" , "̲̳"],
    // ["^~"  , "̃͌"],
    // ["_~"  , "̰"],
    // ["^."  , "̇̈⃛⃜"],
    // ["_."  , "̣̤"],
    // ["^l"  , "⃖⃐⃔"],
    // ["^l-" , "⃖"],
    // ["^r"  , "⃗⃑⃕"],
    // ["^r-" , "⃗"],
    // ["^lr" , "⃡"],
    // ["_lr" , "͍"],
    // ["^^"  , "̂̑͆"],
    // ["_^"  , "̭̯̪"],
    // ["^v"  , "̌̆"],
    // ["_v"  , "̬̮̺"],

    // Shorter forms of many greek letters plus ƛ.
    ["Ga", "α"],
    ["GA", "Α"],
    ["Gb", "β"],
    ["GB", "Β"],
    ["Gg", "γ"],
    ["GG", "Γ"],
    ["Gd", "δ"],
    ["GD", "Δ"],
    ["Ge", "ε"],
    ["GE", "Ε"],
    ["Gz", "ζ"],
    ["GZ", "Ζ"],
    ["Gth", "θ"],
    ["GTH", "Θ"],
    ["Gi", "ι"],
    ["GI", "Ι"],
    ["Gk", "κ"],
    ["GK", "Κ"],
    ["Gl", "λ"],
    ["GL", "Λ"],
    ["Gl-", "ƛ"],
    ["Gm", "μ"],
    ["GM", "Μ"],
    ["Gn", "ν"],
    ["GN", "Ν"],
    ["Gx", "ξ"],
    ["GX", "Ξ"],
    ["Gr", "ρ"],
    ["GR", "Ρ"],
    ["Gs", "σ"],
    ["GS", "Σ"],
    ["Gt", "τ"],
    ["GT", "Τ"],
    ["Gu", "υ"],
    ["GU", "Υ"],
    ["Gf", "φ"],
    ["GF", "Φ"],
    ["Gc", "χ"],
    ["GC", "Χ"],
    ["Gp", "ψ"],
    ["GP", "Ψ"],
    ["Go", "ω"],
    ["GO", "Ω"],

    // Mathematical characters
    // ["MiA", "𝐴"], ["MiB", "𝐵"], ["MiC", "𝐶"], ["MiD", "𝐷"],
    // ["MiE", "𝐸"], ["MiF", "𝐹"], ["MiG", "𝐺"], ["MiH", "𝐻"],
    // ["MiI", "𝐼"], ["MiJ", "𝐽"], ["MiK", "𝐾"], ["MiL", "𝐿"],
    // ["MiM", "𝑀"], ["MiN", "𝑁"], ["MiO", "𝑂"], ["MiP", "𝑃"],
    // ["MiQ", "𝑄"], ["MiR", "𝑅"], ["MiS", "𝑆"], ["MiT", "𝑇"],
    // ["MiU", "𝑈"], ["MiV", "𝑉"], ["MiW", "𝑊"], ["MiX", "𝑋"],
    // ["MiY", "𝑌"], ["MiZ", "𝑍"],
    // ["Mia", "𝑎"], ["Mib", "𝑏"], ["Mic", "𝑐"], ["Mid", "𝑑"],
    // ["Mie", "𝑒"], ["Mif", "𝑓"], ["Mig", "𝑔"],
    // ["Mii", "𝑖"], ["Mij", "𝑗"], ["Mik", "𝑘"], ["Mil", "𝑙"],
    // ["Mim", "𝑚"], ["Min", "𝑛"], ["Mio", "𝑜"], ["Mip", "𝑝"],
    // ["Miq", "𝑞"], ["Mir", "𝑟"], ["Mis", "𝑠"], ["Mit", "𝑡"],
    // ["Miu", "𝑢"], ["Miv", "𝑣"], ["Miw", "𝑤"], ["Mix", "𝑥"],
    // ["Miy", "𝑦"], ["Miz", "𝑧"],
    // ["MIA", "𝑨"], ["MIB", "𝑩"], ["MIC", "𝑪"], ["MID", "𝑫"],
    // ["MIE", "𝑬"], ["MIF", "𝑭"], ["MIG", "𝑮"], ["MIH", "𝑯"],
    // ["MII", "𝑰"], ["MIJ", "𝑱"], ["MIK", "𝑲"], ["MIL", "𝑳"],
    // ["MIM", "𝑴"], ["MIN", "𝑵"], ["MIO", "𝑶"], ["MIP", "𝑷"],
    // ["MIQ", "𝑸"], ["MIR", "𝑹"], ["MIS", "𝑺"], ["MIT", "𝑻"],
    // ["MIU", "𝑼"], ["MIV", "𝑽"], ["MIW", "𝑾"], ["MIX", "𝑿"],
    // ["MIY", "𝒀"], ["MIZ", "𝒁"],
    // ["MIa", "𝒂"], ["MIb", "𝒃"], ["MIc", "𝒄"], ["MId", "𝒅"],
    // ["MIe", "𝒆"], ["MIf", "𝒇"], ["MIg", "𝒈"], ["MIh", "𝒉"],
    // ["MIi", "𝒊"], ["MIj", "𝒋"], ["MIk", "𝒌"], ["MIl", "𝒍"],
    // ["MIm", "𝒎"], ["MIn", "𝒏"], ["MIo", "𝒐"], ["MIp", "𝒑"],
    // ["MIq", "𝒒"], ["MIr", "𝒓"], ["MIs", "𝒔"], ["MIt", "𝒕"],
    // ["MIu", "𝒖"], ["MIv", "𝒗"], ["MIw", "𝒘"], ["MIx", "𝒙"],
    // ["MIy", "𝒚"], ["MIz", "𝒛"],
    // ["McA", "𝒜"], ["McB", "ℬ"], ["McC", "𝒞"], ["McD", "𝒟"],
    // ["McE", "ℰ"], ["McF", "ℱ"], ["McG", "𝒢"], ["McH", "ℋ"],
    // ["McI", "ℐ"], ["McJ", "𝒥"], ["McK", "𝒦"], ["McL", "ℒ"],
    // ["McM", "ℳ"], ["McN", "𝒩"], ["McO", "𝒪"], ["McP", "𝒫"],
    // ["McQ", "𝒬"], ["McR", "ℛ"], ["McS", "𝒮"], ["McT", "𝒯"],
    // ["McU", "𝒰"], ["McV", "𝒱"], ["McW", "𝒲"], ["McX", "𝒳"],
    // ["McY", "𝒴"], ["McZ", "𝒵"],
    // ["Mca", "𝒶"], ["Mcb", "𝒷"], ["Mcc", "𝒸"], ["Mcd", "𝒹"],
    // ["Mce", "ℯ"], ["Mcf", "𝒻"], ["Mcg", "ℊ"], ["Mch", "𝒽"],
    // ["Mci", "𝒾"], ["Mcj", "𝒿"], ["Mck", "𝓀"], ["Mcl", "𝓁"],
    // ["Mcm", "𝓂"], ["Mcn", "𝓃"], ["Mco", "ℴ"], ["Mcp", "𝓅"],
    // ["Mcq", "𝓆"], ["Mcr", "𝓇"], ["Mcs", "𝓈"], ["Mct", "𝓉"],
    // ["Mcu", "𝓊"], ["Mcv", "𝓋"], ["Mcw", "𝓌"], ["Mcx", "𝓍"],
    // ["Mcy", "𝓎"], ["Mcz", "𝓏"],
    // ["MCA", "𝓐"], ["MCB", "𝓑"], ["MCC", "𝓒"], ["MCD", "𝓓"],
    // ["MCE", "𝓔"], ["MCF", "𝓕"], ["MCG", "𝓖"], ["MCH", "𝓗"],
    // ["MCI", "𝓘"], ["MCJ", "𝓙"], ["MCK", "𝓚"], ["MCL", "𝓛"],
    // ["MCM", "𝓜"], ["MCN", "𝓝"], ["MCO", "𝓞"], ["MCP", "𝓟"],
    // ["MCQ", "𝓠"], ["MCR", "𝓡"], ["MCS", "𝓢"], ["MCT", "𝓣"],
    // ["MCU", "𝓤"], ["MCV", "𝓥"], ["MCW", "𝓦"], ["MCX", "𝓧"],
    // ["MCY", "𝓨"], ["MCZ", "𝓩"],
    // ["MCa", "𝓪"], ["MCb", "𝓫"], ["MCc", "𝓬"], ["MCd", "𝓭"],
    // ["MCe", "𝓮"], ["MCf", "𝓯"], ["MCg", "𝓰"], ["MCh", "𝓱"],
    // ["MCi", "𝓲"], ["MCj", "𝓳"], ["MCk", "𝓴"], ["MCl", "𝓵"],
    // ["MCm", "𝓶"], ["MCn", "𝓷"], ["MCo", "𝓸"], ["MCp", "𝓹"],
    // ["MCq", "𝓺"], ["MCr", "𝓻"], ["MCs", "𝓼"], ["MCt", "𝓽"],
    // ["MCu", "𝓾"], ["MCv", "𝓿"], ["MCw", "𝔀"], ["MCx", "𝔁"],
    // ["MCy", "𝔂"], ["MCz", "𝔃"],
    // ["MfA", "𝔄"], ["MfB", "𝔅"], ["MfD", "𝔇"], ["MfE", "𝔈"],
    // ["MfF", "𝔉"], ["MfG", "𝔊"], ["MfJ", "𝔍"], ["MfK", "𝔎"],
    // ["MfL", "𝔏"], ["MfM", "𝔐"], ["MfN", "𝔑"], ["MfO", "𝔒"],
    // ["MfP", "𝔓"], ["MfQ", "𝔔"], ["MfS", "𝔖"], ["MfT", "𝔗"],
    // ["MfU", "𝔘"], ["MfV", "𝔙"], ["MfW", "𝔚"], ["MfX", "𝔛"],
    // ["MfY", "𝔜"],
    // ["Mfa", "𝔞"], ["Mfb", "𝔟"], ["Mfc", "𝔠"], ["Mfd", "𝔡"],
    // ["Mfe", "𝔢"], ["Mff", "𝔣"], ["Mfg", "𝔤"], ["Mfh", "𝔥"],
    // ["Mfi", "𝔦"], ["Mfj", "𝔧"], ["Mfk", "𝔨"], ["Mfl", "𝔩"],
    // ["Mfm", "𝔪"], ["Mfn", "𝔫"], ["Mfo", "𝔬"], ["Mfp", "𝔭"],
    // ["Mfq", "𝔮"], ["Mfr", "𝔯"], ["Mfs", "𝔰"], ["Mft", "𝔱"],
    // ["Mfu", "𝔲"], ["Mfv", "𝔳"], ["Mfw", "𝔴"], ["Mfx", "𝔵"],
    // ["Mfy", "𝔶"], ["Mfz", "𝔷"],

    // (Sub / Super) scripts
    ["_1", "₁"],
    ["_2", "₂"],
    ["_3", "₃"],
    ["_4", "₄"],

    // ["_a", "ₐ"],
    // ["_e", "ₑ"],
    // ["_h", "ₕ"],
    ["_i", "ᵢ"],
    ["_j", "ⱼ"],
    ["_k", "ₖ"],
    // ["_l", "ₗ"],
    ["_m", "ₘ"],
    ["_n", "ₙ"],
    // ["_o", "ₒ"],
    // ["_p", "ₚ"],
    // ["_r", "ᵣ"],
    // ["_s", "ₛ"],
    // ["_t", "ₜ"],
    // ["_u", "ᵤ"],
    // ["_x", "ₓ"],

    // ["^a", "ᵃ"],
    // ["^b", "ᵇ"],
    // ["^c", "ᶜ"],
    // ["^d", "ᵈ"],
    // ["^e", "ᵉ"],
    // ["^f", "ᶠ"],
    // ["^g", "ᵍ"],
    // ["^h", "ʰ"],
    // ["^i", "ⁱ"],
    // ["^j", "ʲ"],
    // ["^k", "ᵏ"],
    // ["^l", "ˡ"],
    // ["^m", "ᵐ"],
    ["^n", "ⁿ"],
    // ["^o", "ᵒ"],
    // ["^p", "ᵖ"],
    // ["^r", "ʳ"],
    ["^s", "ˢ"],
    // ["^t", "ᵗ"],
    // ["^u", "ᵘ"],
    // ["^v", "ᵛ"],
    // ["^w", "ʷ"],
    // ["^x", "ˣ"],
    // ["^y", "ʸ"],
    // ["^z", "ᶻ"],

    // ["^A", "ᴬ"], ["^B", "ᴮ"], ["^D", "ᴰ"],
    // ["^E", "ᴱ"], ["^G", "ᴳ"], ["^H", "ᴴ"],
    // ["^I", "ᴵ"], ["^J", "ᴶ"], ["^K", "ᴷ"], ["^L", "ᴸ"],
    // ["^M", "ᴹ"], ["^N", "ᴺ"], ["^O", "ᴼ"], ["^P", "ᴾ"],
    // ["^R", "ᴿ"], ["^T", "ᵀ"], ["^U", "ᵁ"], ["^V", "ⱽ"],
    // ["^W", "ᵂ"],

    // Some ISO8859-1 characters.
    // [" ", " "],
    // ["!", "¡"],
    // ["cent", "¢"],
    // ["brokenbar", "¦"],
    // ["degree", "°"],
    // ["?", "¿"],
    // ["^a_", "ª"],
    // ["^o_", "º"],

    // Circled, parenthesised etc. numbers and letters.
    // ["(0)", " ⓪"],
    // ["(1)", "⑴①⒈❶➀➊"], ["(2)", "⑵②⒉❷➁➋"], ["(3)", "⑶③⒊❸➂➌"],
    // ["(4)", "⑷④⒋❹➃➍"], ["(5)", "⑸⑤⒌❺➄➎"], ["(6)", "⑹⑥⒍❻➅➏"],
    // ["(7)", "⑺⑦⒎❼➆➐"], ["(8)", "⑻⑧⒏❽➇➑"], ["(9)", "⑼⑨⒐❾➈➒"],
    // ["(10)", "⑽⑩⒑❿➉➓"], ["(11)", "⑾⑪⒒"], ["(12)", "⑿⑫⒓"],
    // ["(13)", "⒀⑬⒔"], ["(14)", "⒁⑭⒕"], ["(15)", "⒂⑮⒖"],
    // ["(16)", "⒃⑯⒗"], ["(17)", "⒄⑰⒘"], ["(18)", "⒅⑱⒙"],
    // ["(19)", "⒆⑲⒚"], ["(20)", "⒇⑳⒛"],
    //
    // ["(a)", "⒜Ⓐⓐ"], ["(b)", "⒝Ⓑⓑ"], ["(c)", "⒞Ⓒⓒ"], ["(d)", "⒟Ⓓⓓ"],
    // ["(e)", "⒠Ⓔⓔ"], ["(f)", "⒡Ⓕⓕ"], ["(g)", "⒢Ⓖⓖ"], ["(h)", "⒣Ⓗⓗ"],
    // ["(i)", "⒤Ⓘⓘ"], ["(j)", "⒥Ⓙⓙ"], ["(k)", "⒦Ⓚⓚ"], ["(l)", "⒧Ⓛⓛ"],
    // ["(m)", "⒨Ⓜⓜ"], ["(n)", "⒩Ⓝⓝ"], ["(o)", "⒪Ⓞⓞ"], ["(p)", "⒫Ⓟⓟ"],
    // ["(q)", "⒬Ⓠⓠ"], ["(r)", "⒭Ⓡⓡ"], ["(s)", "⒮Ⓢⓢ"], ["(t)", "⒯Ⓣⓣ"],
    // ["(u)", "⒰Ⓤⓤ"], ["(v)", "⒱Ⓥⓥ"], ["(w)", "⒲Ⓦⓦ"], ["(x)", "⒳Ⓧⓧ"],
    // ["(y)", "⒴Ⓨⓨ"], ["(z)", "⒵Ⓩⓩ"],
  ]);

  // Returns CodeMirror hint function.
  // TODO Doesn't seem to work for some characters like `(`
  const createHint = table => (editor, _options) => {
    const cur = editor.getCursor();
    const curPos = { line: cur.line, ch: cur.ch };
    const matchEnd = { line: cur.line, ch: cur.ch };
    // Match backwards from the cursor to the back slash.
    let match = "";
    while (curPos.ch >= 0) {
      --curPos.ch;
      match = editor.getRange(curPos, matchEnd);
      if (match[0] === "\\") break;
    }

    const matchStart = curPos;
    const insertFun = (cm, _self, data) =>
      cm.replaceRange(data.symbol, matchStart, matchEnd);

    const list = [];
    for (const obj of table) {
      if (obj.text.startsWith(match)) {
        obj.hint = insertFun;
        list.push(obj);
      }
    }

    return { list: list, from: matchStart, to: matchEnd };
  };

  // TODO Is it possible to disable running this hook in other modes?
  CodeMirror.defineInitHook(function(cm) {
    cm.addKeyMap({
      "\\": function(cm) {
        cm.replaceSelection("\\");
        cm.execCommand("autocomplete");
      },
    });

    const cmplOpt = cm.getOption("hintOptions") || {};
    cmplOpt["extraKeys"] = {
      // Complete using space
      Space: function(cm) {
        const cA = cm.state.completionActive;
        if (cA) {
          cA.widget.pick();
          cm.replaceSelection(" ");
        }
      },
    };
    cm.setOption("hintOptions", cmplOpt);
  });

  CodeMirror.registerGlobalHelper(
    "hint",
    "agda-input",
    // only enable in agda mode for now
    (mode, cm) => mode && mode.name === "agda",
    createHint(translations)
  );

}));
