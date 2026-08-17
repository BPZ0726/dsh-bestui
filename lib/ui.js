/**
 * dsh-bestui — settings-row UI (React component factory).
 *
 * Import-free on purpose: like lib/runtime.js, this source is inlined verbatim
 * into the two generated bundles. Everything the component needs arrives
 * through `createUi(React, api)` — `React` is the shell's shared instance and
 * `api` is the runtime returned by createRuntime(). The token list used for
 * rendering travels on `api.tokenDefs`, so this file has no cross-file
 * references at all.
 */

export function createUi(React, api) {
  const e = React.createElement;
  const useState = React.useState;
  const useRef = React.useRef;
  const useSyncExternalStore = React.useSyncExternalStore;
  const useEffect = React.useEffect;

  const LANG = typeof navigator !== "undefined"
    && typeof navigator.language === "string"
    && navigator.language.toLowerCase().startsWith("zh")
    ? "zh"
    : "en";

  const t = (zh, en) => (LANG === "zh" ? zh : en);

  function Section({ title, open, onToggle, children }) {
    return e("div", { className: "dsw-section" },
      e("button", {
        type: "button",
        className: "dsw-section-head",
        onClick: onToggle,
        "aria-expanded": open === true,
      },
        e("span", { className: "dsw-section-head-title" },
          e("span", { className: open ? "dsw-caret dsw-open" : "dsw-caret" }, "\u25B6"),
          title
        )
      ),
      open ? children : null
    );
  }

  function SliderField({ label, value, min, max, step, onChange, format, useDefault, onToggleDefault }) {
    const hasDefault = typeof onToggleDefault === "function";
    const isDefault = hasDefault && useDefault === true;
    return e("div", { className: "dsw-field" },
      e("div", { className: "dsw-field-row" },
        e("span", { className: "dsw-field-label" }, label),
        e("input", {
          className: "dsw-slider",
          type: "range",
          min,
          max,
          step,
          disabled: isDefault,
          value: Number(value) || 0,
          onChange: (event) => onChange(parseFloat(event.target.value)),
        }),
        e("span", { className: "dsw-value" },
          isDefault
            ? t("\u9ED8\u8BA4", "default")
            : (typeof format === "function" ? format(value) : String(value))
        ),
        hasDefault
          ? e("label", { className: "dsw-default-check" },
            e("input", {
              type: "checkbox",
              checked: isDefault,
              onChange: (event) => onToggleDefault(event.target.checked),
            }),
            t("\u9ED8\u8BA4", "default")
          )
          : null
      )
    );
  }

  function ColorRow({ def, pair, onLight, onDark }) {
    return e("div", { className: "dsw-color-row" },
      e("span", { className: "dsw-color-name" }, def[LANG] || def.en || def.zh),
      e("label", { className: "dsw-color-pair" },
        e("span", null, t("\u6D45", "L")),
        e("input", {
          className: "dsw-color",
          type: "color",
          value: pair.light,
          onChange: (event) => onLight(event.target.value),
        })
      ),
      e("label", { className: "dsw-color-pair" },
        e("span", null, t("\u6DF1", "D")),
        e("input", {
          className: "dsw-color",
          type: "color",
          value: pair.dark,
          onChange: (event) => onDark(event.target.value),
        })
      )
    );
  }

  function ExtraRow({ def, pair, onLight, onDark }) {
    const light = api.cssToPicker(pair.light);
    const dark = api.cssToPicker(pair.dark);
    return e("div", { className: "dsw-color-row" },
      e("span", { className: "dsw-color-name" }, def[LANG] || def.en || def.zh),
      e("label", { className: "dsw-color-pair" },
        e("span", null, t("\u6D45", "L")),
        e("input", {
          className: "dsw-color",
          type: "color",
          value: light.color,
          onChange: (event) => onLight(api.pickerToCss(event.target.value, light.alpha)),
        }),
        e("input", {
          className: "dsw-alpha",
          type: "number",
          min: 0,
          max: 1,
          step: 0.01,
          value: Math.round(light.alpha * 100) / 100,
          onChange: (event) => {
            const a = parseFloat(event.target.value);
            onLight(api.pickerToCss(light.color, isFinite(a) ? a : 1));
          },
        })
      ),
      e("label", { className: "dsw-color-pair" },
        e("span", null, t("\u6DF1", "D")),
        e("input", {
          className: "dsw-color",
          type: "color",
          value: dark.color,
          onChange: (event) => onDark(api.pickerToCss(event.target.value, dark.alpha)),
        }),
        e("input", {
          className: "dsw-alpha",
          type: "number",
          min: 0,
          max: 1,
          step: 0.01,
          value: Math.round(dark.alpha * 100) / 100,
          onChange: (event) => {
            const a = parseFloat(event.target.value);
            onDark(api.pickerToCss(dark.color, isFinite(a) ? a : 1));
          },
        })
      )
    );
  }

  function WallpaperRow() {
    const state = useSyncExternalStore(api.store.subscribe, api.store.get);
    const [openImage, setOpenImage] = useState(true);
    const [openOpacity, setOpenOpacity] = useState(true);
    const [openColors, setOpenColors] = useState(false);
    const [openFonts, setOpenFonts] = useState(false);
    const [openShape, setOpenShape] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [schemeError, setSchemeError] = useState(null);
    const fileRef = useRef(null);
    const importRef = useRef(null);

    useEffect(() => {
      api.ensureCss();
    }, []);

    const defs = api.tokenDefs || [];
    const extraDefs = api.extraDefs || [];
    const surfaceDefs = defs.filter((def) => def.kind === "surface");
    const borderDefs = defs.filter((def) => def.kind === "border");
    const stateDefs = defs.filter((def) => def.id.indexOf("state-") !== -1);
    const mainDefs = defs.filter((def) => def.kind === "plain" && def.id.indexOf("state-") === -1);
    const extraBorderDefs = extraDefs.filter((def) => def.kind === "border");
    const extraOtherDefs = extraDefs.filter((def) => def.kind !== "border");

    const pickFile = () => {
      const node = fileRef.current;
      if (node && typeof node.click === "function") node.click();
    };

    const onFileChange = async (event) => {
      const files = event && event.target && event.target.files;
      const file = files && files.length > 0 ? files[0] : null;
      if (event && event.target) event.target.value = "";
      if (!file) return;
      setBusy(true);
      setError(null);
      const result = await api.uploadImage(file);
      setBusy(false);
      if (!result || result.ok !== true) {
        setError(t("\u65E0\u6CD5\u8BFB\u53D6\u8BE5\u56FE\u7247\uFF0C\u8BF7\u6362\u4E00\u5F20\u5C1D\u8BD5\u3002", "Could not read that image, please try another one."));
      }
    };

    const onAutoColors = async () => {
      setBusy(true);
      const result = await api.autoColors();
      if (result !== null && state.followScheme) api.setTheme(result.scheme);
      setBusy(false);
    };

    const onResetAll = () => {
      const sure = typeof window !== "undefined"
        && typeof window.confirm === "function"
        ? window.confirm(t("\u786E\u5B9A\u8981\u6E05\u9664\u58C1\u7EB8\u4E0E\u6240\u6709\u81EA\u5B9A\u4E49\uFF1F", "Reset the wallpaper and every custom color?"))
        : true;
      if (sure) api.resetAll();
    };

    const onExportScheme = () => {
      setSchemeError(null);
      if (typeof document === "undefined" || typeof Blob === "undefined"
        || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        setSchemeError(t("\u65E0\u6CD5\u5BFC\u51FA\uFF1A\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u4E0B\u8F7D", "Export failed: downloads are not supported here."));
        return;
      }
      try {
        const blob = new Blob([api.exportScheme()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "best-ui-scheme.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => {
          try { URL.revokeObjectURL(url); } catch { /* ignore */ }
        }, 1000);
      } catch {
        setSchemeError(t("\u65E0\u6CD5\u5BFC\u51FA\u65B9\u6848", "Could not export the scheme."));
      }
    };

    const pickImport = () => {
      const node = importRef.current;
      if (node && typeof node.click === "function") node.click();
    };

    const onImportFile = (event) => {
      const files = event && event.target && event.target.files;
      const file = files && files.length > 0 ? files[0] : null;
      if (event && event.target) event.target.value = "";
      if (!file) return;
      if (typeof FileReader === "undefined") return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        const result = api.importScheme(reader.result);
        setSchemeError(result && result.ok === true
          ? null
          : t("\u5BFC\u5165\u5931\u8D25\uFF1A\u6587\u4EF6\u4E0D\u662F\u6709\u6548\u7684\u65B9\u6848 JSON", "Import failed: the file is not a valid scheme JSON."));
      };
      reader.onerror = () => {
        setSchemeError(t("\u65E0\u6CD5\u8BFB\u53D6\u8BE5\u6587\u4EF6", "Could not read that file."));
      };
      reader.readAsText(file);
    };

    const imageStyle = state.imageStyle || {};
    const opacityValue = (id) => (typeof state.opacities[id] === "number" ? state.opacities[id] : 1);

    return e("div", { className: "dsw-root" },
      // header + master toggle
      e("div", { className: "dsw-title" },
        e("span", { className: "dsw-title-name" }, t("\u58C1\u7EB8\u4E3B\u9898 \u00B7 BestUI", "BestUI")),
        e("label", null,
          e("input", {
            type: "checkbox",
            checked: state.enabled === true,
            onChange: (event) => api.setEnabled(event.target.checked),
          }),
          t("\u542F\u7528", "Enable")
        )
      ),
      e("div", { className: "dsw-desc" },
        t(
          "\u4EE5\u56FE\u7247\u4F5C\u4E3A\u754C\u9762\u80CC\u666F\uFF1B\u5404\u900F\u660E\u90E8\u4EF6\u53EF\u5355\u72EC\u8C03\u8282\u4E0D\u900F\u660E\u5EA6\uFF1B\u6BCF\u4E2A\u5143\u7D20\u53EF\u6309\u6D45\u8272/\u6DF1\u8272\u65B9\u6848\u81EA\u5B9A\u4E49\u989C\u8272\uFF1B\u4E5F\u53EF\u4ECE\u56FE\u7247\u6216\u7CFB\u7EDF\u4E3B\u9898\u81EA\u52A8\u751F\u6210\u914D\u8272\u3002",
          "Upload an image as the background; each translucent surface gets its own opacity; every element's color is customizable per light/dark scheme; or generate a palette automatically from the image or the browser theme."
        )
      ),

      // auto controls
      e("div", { className: "dsw-switch-row" },
        e("label", null,
          e("input", {
            type: "checkbox",
            checked: state.mode === "auto",
            onChange: (event) => api.setMode(event.target.checked ? "auto" : "custom"),
          }),
          t("\u81EA\u52A8\u914D\u8272", "Auto palette")
        ),
        e("label", null,
          e("input", {
            type: "checkbox",
            checked: state.followScheme === true,
            onChange: (event) => api.setFollowScheme(event.target.checked),
          }),
          t("\u4E0A\u4F20\u540E\u6309\u56FE\u7247\u660E\u6697\u81EA\u52A8\u5207\u6362\u4E3B\u9898", "Match theme to image brightness after upload")
        )
      ),
      e("div", { className: "dsw-btn-row" },
        e("button", { type: "button", className: "dsw-btn dsw-btn-primary", onClick: onAutoColors, disabled: busy },
          t("\u81EA\u52A8\u914D\u8272", "Auto colors")
        ),
        e("button", { type: "button", className: "dsw-btn", onClick: () => api.resetColors() },
          t("\u6062\u590D\u9ED8\u8BA4\u914D\u8272", "Default colors")
        ),
        e("button", { type: "button", className: "dsw-btn", onClick: () => api.setTheme("system") },
          t("\u8DDF\u968F\u7CFB\u7EDF\u6DF1\u6D45", "Follow system")
        ),
        e("button", { type: "button", className: "dsw-btn", onClick: () => api.setTheme("light") },
          t("\u5E94\u7528\u6D45\u8272\u65B9\u6848", "Apply light scheme")
        ),
        e("button", { type: "button", className: "dsw-btn", onClick: () => api.setTheme("dark") },
          t("\u5E94\u7528\u6DF1\u8272\u65B9\u6848", "Apply dark scheme")
        ),
        e("button", { type: "button", className: "dsw-btn dsw-btn-danger", onClick: onResetAll },
          t("\u5168\u90E8\u91CD\u7F6E", "Reset all")
        )
      ),

      // scheme export / import
      e("div", { className: "dsw-btn-row" },
        e("button", { type: "button", className: "dsw-btn", onClick: onExportScheme },
          t("\u5BFC\u51FA\u65B9\u6848", "Export scheme")
        ),
        e("button", { type: "button", className: "dsw-btn", onClick: pickImport },
          t("\u5BFC\u5165\u65B9\u6848", "Import scheme")
        ),
        e("input", { type: "file", accept: "application/json,.json", className: "dsw-file-input", ref: importRef, onChange: onImportFile })
      ),
      e("div", { className: "dsw-hint" },
        t("\u5BFC\u51FA\u4E3A JSON \u6587\u4EF6\uFF08\u58C1\u7EB8\u3001\u914D\u8272\u3001\u5B57\u4F53\u3001\u5706\u89D2\u3001\u4E0D\u900F\u660E\u5EA6\u7B49\u5168\u90E8\u8BBE\u7F6E\uFF09\uFF1B\u5BFC\u5165\u540E\u6574\u4F53\u66FF\u6362\u5F53\u524D\u65B9\u6848\u3002", "Exports every setting (wallpaper, colors, fonts, radii, opacities) as a JSON file; importing replaces the current scheme.")
      ),
      schemeError !== null ? e("div", { className: "dsw-hint dsw-error" }, schemeError) : null,

      // image section
      e(Section, { title: t("\u80CC\u666F\u56FE\u7247", "Background image"), open: openImage, onToggle: () => setOpenImage(!openImage) },
        e("div", { className: "dsw-preview" },
          state.image
            ? e("img", { src: state.image.dataUrl, alt: state.image.name || "" })
            : e("div", { className: "dsw-preview-empty" }, t("\u5C1A\u672A\u4E0A\u4F20\u56FE\u7247", "No image uploaded yet"))
        ),
        e("input", { type: "file", accept: "image/*", className: "dsw-file-input", ref: fileRef, onChange: onFileChange }),
        e("div", { className: "dsw-hint" },
          t("\u652F\u6301 JPG / PNG / WebP / GIF \u7B49\u56FE\u7247\u683C\u5F0F\uFF1BGIF \u52A8\u56FE\u4F1A\u4FDD\u7559\u52A8\u753B\u6548\u679C\u3002", "Supports JPG, PNG, WebP, GIF and other image formats; animated GIFs keep their animation.")
        ),
        error !== null ? e("div", { className: "dsw-hint dsw-error" }, error) : null,
        e("div", { className: "dsw-btn-row" },
          e("button", { type: "button", className: "dsw-btn dsw-btn-primary", onClick: pickFile, disabled: busy },
            busy
              ? t("\u5904\u7406\u4E2D\u2026", "Processing\u2026")
              : state.image
                ? t("\u66F4\u6362\u56FE\u7247", "Replace image")
                : t("\u4E0A\u4F20\u56FE\u7247", "Upload image")
          ),
          state.image
            ? e("button", { type: "button", className: "dsw-btn dsw-btn-danger", onClick: () => api.removeImage() },
              t("\u79FB\u9664\u56FE\u7247", "Remove image")
            )
            : null,
          state.image && typeof state.image.name === "string" && state.image.name.length > 0
            ? e("span", { className: "dsw-hint" }, state.image.name)
            : null
        ),
        state.image
          ? e("div", { className: "dsw-field" },
            e("div", { className: "dsw-field-row" },
              e("span", { className: "dsw-field-label" }, t("\u9002\u5E94", "Fit")),
              e("select", {
                className: "dsw-select",
                value: imageStyle.fit || "cover",
                onChange: (event) => api.setImageStyle("fit", event.target.value),
              },
                e("option", { value: "cover" }, t("\u586B\u5145\uFF08\u88C1\u5207\uFF09", "Cover")),
                e("option", { value: "contain" }, t("\u5B8C\u6574\u5305\u542B", "Contain")),
                e("option", { value: "fill" }, t("\u62C9\u4F38\u586B\u6EE1", "Stretch")),
                e("option", { value: "none" }, t("\u539F\u59CB\u5C3A\u5BF8", "Original"))
              ),
              e("span", { className: "dsw-field-label" }, t("\u4F4D\u7F6E", "Position")),
              e("select", {
                className: "dsw-select",
                value: imageStyle.position || "center",
                onChange: (event) => api.setImageStyle("position", event.target.value),
              },
                e("option", { value: "center" }, t("\u5C45\u4E2D", "Center")),
                e("option", { value: "top" }, t("\u9876\u90E8", "Top")),
                e("option", { value: "bottom" }, t("\u5E95\u90E8", "Bottom")),
                e("option", { value: "left" }, t("\u5DE6\u4FA7", "Left")),
                e("option", { value: "right" }, t("\u53F3\u4FA7", "Right"))
              )
            ),
            e(SliderField, {
              label: t("\u6A21\u7CCA", "Blur"),
              value: imageStyle.blur || 0,
              min: 0,
              max: 40,
              step: 1,
              onChange: (v) => api.setImageStyle("blur", v),
              format: (v) => `${v}px`,
            }),
            e(SliderField, {
              label: t("\u53D8\u6697\u63D0\u4EAE", "Dim / lighten"),
              value: imageStyle.dim || 0,
              min: 0,
              max: 0.9,
              step: 0.01,
              onChange: (v) => api.setImageStyle("dim", v),
              format: (v) => `${Math.round((Number(v) || 0) * 100)}%`,
            })
          )
          : null
      ),

      // opacity section
      e(Section, { title: t("\u900F\u660E\u90E8\u4EF6\u4E0D\u900F\u660E\u5EA6", "Surface opacity"), open: openOpacity, onToggle: () => setOpenOpacity(!openOpacity) },
        e("div", { className: "dsw-hint" },
          t("\u52FE\u9009\u300C\u9ED8\u8BA4\u300D\u5373\u5B8C\u5168\u4E0D\u900F\u660E\uFF08\u8DDF\u968F\u4EA7\u54C1\uFF09\uFF1B\u53D6\u6D88\u52FE\u9009\u540E\u62D6\u52A8\u6ED1\u6746\uFF0C\u6570\u503C\u8D8A\u5C0F\u58C1\u7EB8\u900F\u51FA\u8D8A\u591A\u3002\u53EF\u8C03\u9879\uFF1A\u80CC\u666F\u57FA\u5E95\u3001\u7B2C\u4E8C\u5C42\u8868\u9762\u3001\u4FA7\u8FB9\u680F\u3002\u300C\u4E3B\u9898\u8272\u7A81\u51FA\u7A0B\u5EA6\u300D\u8D8A\u9AD8\uFF0C\u8868\u9762\u4E0E\u4FA7\u8FB9\u680F\u7684\u4E3B\u9898\u8272\u8C03\u8D8A\u6D53\u3002", "Check \"default\" on the right to stay fully opaque (following the product); uncheck and drag the slider — lower values let the wallpaper show through more. This section covers the base background, layer 2 surface and the sidebar. Higher \"Tint strength\" makes the theme tint on surfaces and the sidebar more pronounced.")
        ),
        e(SliderField, {
          label: t("\u4E3B\u9898\u8272\u7A81\u51FA\u7A0B\u5EA6", "Tint strength"),
          value: typeof state.tintStrength === "number" ? state.tintStrength : 0.5,
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v) => api.setTintStrength(v),
          useDefault: state.tintStrengthDefault === true,
          onToggleDefault: (c) => api.setTintStrengthDefault(c),
          format: (v) => `${Math.round((Number(v) || 0) * 100)}%`,
        }),
        surfaceDefs.filter((def) => (api.opacityIds || []).indexOf(def.id) !== -1).map((def) => e(SliderField, {
          key: def.id,
          label: def[LANG] || def.en,
          value: opacityValue(def.id),
          min: 0,
          max: 1,
          step: 0.01,
          onChange: (v) => api.setOpacity(def.id, v),
          useDefault: state.opacitiesDefault && state.opacitiesDefault[def.id] === true,
          onToggleDefault: (c) => api.setOpacityDefault(def.id, c),
          format: (v) => `${Math.round((Number(v) || 0) * 100)}%`,
        }))
      ),

      // font section
      e(Section, { title: t("\u5B57\u4F53\u8BBE\u7F6E", "Font settings"), open: openFonts, onToggle: () => setOpenFonts(!openFonts) },
        e("div", { className: "dsw-hint" },
          t("\u5B57\u4F53\u98CE\u683C\u3001\u5B57\u91CD\u3001\u5B57\u53F7\u4E0E\u300C\u6587\u5B57\u8272\u76F8\u300D\u5747\u53EF\u8C03\u8282\uFF0C\u52FE\u9009\u300C\u9ED8\u8BA4\u300D\u5373\u8DDF\u968F\u4EA7\u54C1\u539F\u6837\u3002\u6CE8\u610F\uFF1A\u300C\u5B57\u4F53\u5927\u5C0F\u300D\u53EA\u7F29\u653E\u6587\u5B57\uFF0C\u4E0D\u5F71\u54CD\u6309\u94AE\u3001\u7A97\u53E3\u7B49\u63A7\u4EF6\uFF08\u6574\u4F53\u7F29\u653E\u8BF7\u7528\u300C\u754C\u9762\u8BBE\u7F6E\u300D\u2192\u300C\u754C\u9762\u7F29\u653E\u300D\uFF09\u3002", "Tune the font family, weight, size and \"Text hue\"; checking \"default\" on the right follows the product, uncheck it and drag the slider to apply. \"Font size\" changes text only, not controls or windows (use \"UI scale\" in \"Interface settings\" for the whole UI).")
        ),
        e("div", { className: "dsw-field" },
          e("span", { className: "dsw-field-label" }, t("\u5B57\u4F53\u98CE\u683C", "Font family")),
          e("select", {
            className: "dsw-select",
            value: state.fontFamily || "default",
            onChange: (event) => api.setFontFamily(event.target.value),
          },
            e("option", { value: "default" }, t("\u8DDF\u968F\u9ED8\u8BA4", "System default")),
            e("option", { value: "sans" }, t("\u65E0\u886C\u7EBF", "Sans-serif")),
            e("option", { value: "serif" }, t("\u886C\u7EBF", "Serif")),
            e("option", { value: "mono" }, t("\u7B49\u5BBD", "Monospace")),
            e("option", { value: "rounded" }, t("\u5706\u4F53", "Rounded"))
          )
        ),
        e(SliderField, {
          label: t("\u5B57\u91CD", "Font weight"),
          value: typeof state.fontWeight === "number" ? state.fontWeight : 400,
          min: 300,
          max: 800,
          step: 10,
          onChange: (v) => api.setFontWeight(v),
          useDefault: state.fontWeightDefault === true,
          onToggleDefault: (c) => api.setFontWeightDefault(c),
          format: (v) => String(Math.round(Number(v) || 0)),
        }),
        e(SliderField, {
          label: t("\u5B57\u4F53\u5927\u5C0F", "Font size"),
          value: typeof state.fontSize === "number" ? state.fontSize : 1,
          min: 0.75,
          max: 1.5,
          step: 0.01,
          onChange: (v) => api.setFontSize(v),
          useDefault: state.fontSizeDefault === true,
          onToggleDefault: (c) => api.setFontSizeDefault(c),
          format: (v) => `${Math.round((Number(v) || 1) * 100)}%`,
        }),
        e(SliderField, {
          label: t("\u6587\u5B57\u8272\u76F8", "Text hue"),
          value: typeof state.fontHue === "number" ? state.fontHue : 0,
          min: 0,
          max: 360,
          step: 1,
          onChange: (v) => api.setFontHue(v),
          useDefault: state.fontHueDefault === true,
          onToggleDefault: (c) => api.setFontHueDefault(c),
          format: (v) => `${Math.round(Number(v) || 0)}\u00B0`,
        })
      ),

      // interface settings section
      e(Section, { title: t("\u754C\u9762\u8BBE\u7F6E", "Interface settings"), open: openShape, onToggle: () => setOpenShape(!openShape) },
        e("div", { className: "dsw-hint" },
          t("\u52FE\u9009\u300C\u9ED8\u8BA4\u300D\u5373\u8DDF\u968F\u4EA7\u54C1\u539F\u6837\uFF0C\u53D6\u6D88\u52FE\u9009\u540E\u62D6\u52A8\u6ED1\u6746\u751F\u6548\u3002\u5706\u89D2\u4E3A 0 \u662F\u771F\u6B63\u7684\u76F4\u89D2\uFF0C\u8D8A\u5927\u8D8A\u5706\uFF08\u4E0A\u9650\u534A\u5706\uFF09\u3002\u300C\u754C\u9762\u7F29\u653E\u300D\u6574\u4F53\u7F29\u653E\u754C\u9762\u4E0E\u63A7\u4EF6\u3002", "Check \"default\" on the right to follow the product; uncheck and drag the slider to apply. A radius of 0 is a true right angle and larger values are rounder (capped at a half circle). \"UI scale\" resizes the whole interface and its controls.")
        ),
        e("div", { className: "dsw-btn-row" },
          e("button", { type: "button", className: "dsw-btn", onClick: () => api.resetShape() },
            t("\u6062\u590D\u754C\u9762\u9ED8\u8BA4", "Reset interface defaults")
          )
        ),
        e(SliderField, {
          label: t("\u754C\u9762\u7F29\u653E", "UI scale"),
          value: typeof state.fontScale === "number" ? state.fontScale : 1,
          min: 0.75,
          max: 1.5,
          step: 0.01,
          onChange: (v) => api.setFontScale(v),
          useDefault: state.fontScaleDefault === true,
          onToggleDefault: (c) => api.setFontScaleDefault(c),
          format: (v) => `${Math.round((Number(v) || 1) * 100)}%`,
        }),
        e(SliderField, {
          label: t("\u6309\u94AE\u5706\u89D2", "Button radius"),
          value: typeof state.buttonRadius === "number" ? state.buttonRadius : 8,
          min: 0,
          max: 24,
          step: 1,
          onChange: (v) => api.setButtonRadius(v),
          useDefault: state.buttonRadiusDefault === true,
          onToggleDefault: (c) => api.setButtonRadiusDefault(c),
          format: (v) => {
            const r = Math.round(Number(v) || 0);
            return r === 0 ? t("\u76F4\u89D2", "sharp") : `${r}px`;
          },
        }),
        e(SliderField, {
          label: t("\u8F93\u5165\u6846\u5706\u89D2", "Input radius"),
          value: typeof state.inputRadius === "number" ? state.inputRadius : 8,
          min: 0,
          max: 24,
          step: 1,
          onChange: (v) => api.setInputRadius(v),
          useDefault: state.inputRadiusDefault === true,
          onToggleDefault: (c) => api.setInputRadiusDefault(c),
          format: (v) => {
            const r = Math.round(Number(v) || 0);
            return r === 0 ? t("\u76F4\u89D2", "sharp") : `${r}px`;
          },
        }),
        e(SliderField, {
          label: t("\u5361\u7247\u4E0E\u9762\u677F\u5706\u89D2", "Card & panel radius"),
          value: typeof state.cardRadius === "number" ? state.cardRadius : 8,
          min: 0,
          max: 24,
          step: 1,
          onChange: (v) => api.setCardRadius(v),
          useDefault: state.cardRadiusDefault === true,
          onToggleDefault: (c) => api.setCardRadiusDefault(c),
          format: (v) => {
            const r = Math.round(Number(v) || 0);
            return r === 0 ? t("\u76F4\u89D2", "sharp") : `${r}px`;
          },
        }),
        e(SliderField, {
          label: t("\u8BBE\u7F6E\u7A97\u53E3\u5706\u89D2", "Settings window radius"),
          value: typeof state.dialogRadius === "number" ? state.dialogRadius : 12,
          min: 0,
          max: 40,
          step: 1,
          onChange: (v) => api.setDialogRadius(v),
          useDefault: state.dialogRadiusDefault === true,
          onToggleDefault: (c) => api.setDialogRadiusDefault(c),
          format: (v) => {
            const r = Math.round(Number(v) || 0);
            return r === 0 ? t("\u76F4\u89D2", "sharp") : `${r}px`;
          },
        }),
        e(SliderField, {
          label: t("\u8BBE\u7F6E\u7A97\u53E3\u5BBD\u5EA6", "Settings window width"),
          value: typeof state.dialogWidth === "number" ? state.dialogWidth : 480,
          min: 360,
          max: 1400,
          step: 20,
          onChange: (v) => api.setDialogWidth(v),
          useDefault: state.dialogWidthDefault === true,
          onToggleDefault: (c) => api.setDialogWidthDefault(c),
          format: (v) => `${Math.round(Number(v) || 0)}px`,
        }),
        e(SliderField, {
          label: t("\u8BBE\u7F6E\u7A97\u53E3\u9AD8\u5EA6", "Settings window height"),
          value: typeof state.dialogHeight === "number" ? state.dialogHeight : 640,
          min: 320,
          max: 1600,
          step: 20,
          onChange: (v) => api.setDialogHeight(v),
          useDefault: state.dialogHeightDefault === true,
          onToggleDefault: (c) => api.setDialogHeightDefault(c),
          format: (v) => `${Math.round(Number(v) || 0)}px`,
        })
      ),

      // colors section
      e(Section, { title: t("\u5143\u7D20\u989C\u8272", "Element colors"), open: openColors, onToggle: () => setOpenColors(!openColors) },
        e("div", { className: "dsw-hint" },
          t(
            "\u6BCF\u4E2A\u5143\u7D20\u53EF\u5206\u522B\u8BBE\u7F6E\u6D45\u8272/\u6DF1\u8272\u65B9\u6848\u4E0B\u7684\u989C\u8272\uFF0C\u8FB9\u6846\u4E3A\u900F\u660E\u7740\u8272\u3002\u81EA\u52A8\u914D\u8272\u4ECE\u56FE\u7247\u4EAE\u90E8\u63A8\u51FA\u6D45\u8272\u65B9\u6848\u3001\u6697\u90E8\u63A8\u51FA\u6DF1\u8272\u65B9\u6848\uFF0C\u5207\u6362\u4E3B\u9898\u5373\u5957\u7528\uFF1B\u6D6E\u5C42\u3001\u5F39\u7A97\u3001\u4FA7\u8FB9\u680F\u7B49\u8868\u9762\u4F1A\u76F4\u63A5\u5E26\u51FA\u56FE\u7247\u4EAE\u6697\u90E8\u7684\u8272\u8C03\u3002\u989C\u8272\u81EA\u5B9A\u4E49\u4E0E\u300C\u542F\u7528\u300D\u5F00\u5173\u65E0\u5173\u2014\u2014\u5173\u95ED\u58C1\u7EB8\u540E\u914D\u8272\u4F9D\u7136\u751F\u6548\u3002",
            "Each element takes a light-scheme and a dark-scheme color; borders render as translucent tints. Auto-generated palettes derive the light scheme from the image's bright side and the dark scheme from its dark side; switching the theme applies the matching scheme. Surfaces like overlays, popovers and the sidebar now carry the actual tint of the image's bright/dark side instead of near-white / near-black. Color settings are independent of the Enable toggle: your custom palette stays applied even when the wallpaper is off."
          )
        ),
        e("div", { className: "dsw-group-label" }, t("\u8868\u9762", "Surfaces")),
        surfaceDefs.map((def) => e(ColorRow, {
          key: def.id,
          def,
          pair: state.colors[def.id],
          onLight: (hex) => api.setColor(def.id, "light", hex),
          onDark: (hex) => api.setColor(def.id, "dark", hex),
        })),
        e("div", { className: "dsw-group-label" }, t("\u8FB9\u6846", "Borders")),
        borderDefs.map((def) => e(ColorRow, {
          key: def.id,
          def,
          pair: state.colors[def.id],
          onLight: (hex) => api.setColor(def.id, "light", hex),
          onDark: (hex) => api.setColor(def.id, "dark", hex),
        })),
        extraBorderDefs.map((def) => e(ExtraRow, {
          key: def.id,
          def,
          pair: (state.extraColors && state.extraColors[def.id]) || { light: def.light, dark: def.dark },
          onLight: (v) => api.setExtraColor(def.id, "light", v),
          onDark: (v) => api.setExtraColor(def.id, "dark", v),
        })),
        e("div", { className: "dsw-group-label" }, t("\u54C1\u724C\u4E0E\u6587\u5B57", "Brand & text")),
        mainDefs.map((def) => e(ColorRow, {
          key: def.id,
          def,
          pair: state.colors[def.id],
          onLight: (hex) => api.setColor(def.id, "light", hex),
          onDark: (hex) => api.setColor(def.id, "dark", hex),
        })),
        e("div", { className: "dsw-group-label" }, t("\u72B6\u6001\u8272", "State colors")),
        stateDefs.map((def) => e(ColorRow, {
          key: def.id,
          def,
          pair: state.colors[def.id],
          onLight: (hex) => api.setColor(def.id, "light", hex),
          onDark: (hex) => api.setColor(def.id, "dark", hex),
        })),
        e("div", { className: "dsw-group-label" }, t("\u4EA4\u4E92\u4E0E\u6EDA\u52A8\u6761", "Interaction & scrollbars")),
        e("div", { className: "dsw-hint" },
          t("\u4EE5\u4E0B\u9879\u7528\u53D6\u8272\u5668\u8C03\u8272\uFF0C\u53F3\u4FA7\u6570\u5B57\u4E3A\u900F\u660E\u5EA6\uFF080\u20131\uFF09\uFF0C\u4FEE\u6539\u540E\u7ACB\u5373\u751F\u6548\u3002", "Use the color pickers below; the number on the right is the alpha (0\u20131). Changes apply immediately.")
        ),
        extraOtherDefs.map((def) => e(ExtraRow, {
          key: def.id,
          def,
          pair: (state.extraColors && state.extraColors[def.id]) || { light: def.light, dark: def.dark },
          onLight: (v) => api.setExtraColor(def.id, "light", v),
          onDark: (v) => api.setExtraColor(def.id, "dark", v),
        }))
      )
    );
  }

  return WallpaperRow;
}
