<div align="center">
  <br><br>
  <h1>
    <a href="https://github.com/xulbux/vscode-ext-color-tracr"><img width="96" src="https://raw.githubusercontent.com/xulbux/vscode-ext-color-tracr/main/assets/icon.png"></a>
    <br>
    Color Tracr
    <br><br>
    <a href="https://open-vsx.org/extension/xulbux/color-tracr"><img src="https://svg.xul.is/badge/ovsx/xulbux/color-tracr/v?color=indigo" /></a>
    <a href="https://open-vsx.org/extension/xulbux/color-tracr"><img src="https://svg.xul.is/badge/ovsx/xulbux/color-tracr/dt?color=indigo" /></a>
    <a href="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/LICENSE"><img src="https://svg.xul.is/badge/License/MIT*?variant=3&color=neutral&icon=scale" /></a>
    <a href="https://github.com/xulbux/vscode-ext-color-tracr/commits"><img src="https://svg.xul.is/badge/gh/xulbux/vscode-ext-color-tracr/commit?variant=3&color=neutral"/></a>
    <a href="https://github.com/sponsors/xulbux"><img src="https://svg.xul.is/badge/Sponsor?variant=2&color=rose&icon=heart&anim=pulse"/></a>
  </h1>
  <h3>Highly performant, ultra-lightweight color marking extension for the editor.</h3>
  <br><br>
</div>

This VS Code extension provides color marking for various formats, including CSS variables, Tailwind classes, and wide-gamut colors.<br>
It is built to be fast, lightweight, and resource-efficient, featuring **a fully bundled, hyper-optimized architecture**, so your editor never slows down.

> <br>
> &numsp;To get a better feeling of how the markers look on your code, continue at the <a href="#previews"><b>previews</b></a>.
> <br><br>

<br>
<br>

## <a href="#installation"><img src="https://svg.xul.is/icon/package?size=32&stroke=2" align="left" /></a>Installation

Search for **Color Tracr** in the VS Code extensions panel, or install via the command line:

```bash
ext install xulbux.color-tracr
```

<br>

## <a href="#features"><img src="https://svg.xul.is/icon/zap?size=32&stroke=2" align="left" /></a>Features

| Feature | Description |
| :------ | :---------- |
| **Standard Colors** | HEX, RGB, HSL, HWB, HSV, CMYK, OKLCH, LCH, OKLAB, LAB |
| **Color Spaces** | `color(display-p3 ...)`, `color(srgb-linear ...)`, `a98-rgb`, `rec2020`, `xyz`, etc. |
| **Apple / Swift** | `UIColor(red: ...)`, `Color(red: ...)` |
| **Raw Number Matching** | Detects raw CSS channels (e.g., `255, 0, 0` or `60% 0.15 25`) to support opacity modifiers in frameworks like Tailwind CSS. |
| **Named Colors** | Standard CSS color keywords (e.g., `red`, `transparent`, ...) |
| **Tailwind CSS** | Classes like `text-slate-900`, `border-white/20`, `bg-rose-500`, ... |
| **Variable Tracing** | Cross-file detection and marking of CSS variables (e.g., `var(--primary-color)`) |

<br>

## <a href="#configuration"><img src="https://svg.xul.is/icon/settings?size=32&stroke=2" align="left" /></a>Configuration

Color Tracr is highly customizable. You can adjust the following options in your `settings.json` (user or workspace):

| Setting | Type | Default | Description |
| :------ | :--: | :-----: | :---------- |
| `colorTracr.enable` | `array` | `["*"]` | Language IDs where Color Tracr marks colors. Prepend `!` to exclude. |
| `colorTracr.markerType` | `string` | `"highlight"` | Choose how colors are marked: `"highlight"`, `"dot-before"`, or `"dot-after"`. |
| `colorTracr.showAlpha` | `boolean` | `true` | Render each marker using the color's parsed transparency. |
| `colorTracr.markNamedColors` | `boolean` | `true` | Mark standard CSS named colors (like `red`, `tomato`). |
| `colorTracr.markTailwind` | `array` | `["*"]` | Mark Tailwind CSS utility classes (e.g., `bg-red-400`). |
| `colorTracr.markVariables` | `array` | `["*"]` | Mark cross-file CSS/SCSS/LESS variables (`var(--name)`). |
| `colorTracr.useARGB` | `array` | `[]` | Language IDs to parse 4/8-digit hex codes as ARGB instead of RGBA. |

(*For advanced settings like matching raw RGB/HSL values without functions, check the extension settings inside VS Code!*)

<br>

## <a href="#previews"><img src="https://svg.xul.is/icon/circle-fading-play?size=32&stroke=2" align="left" /></a>Previews

### CSS

[![CSS · Dark Editor Preview](https://raw.githubusercontent.com/xulbux/vscode-ext-color-tracr/main/assets/preview/css-dark.png)](https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/css-dark.png)

[![CSS · Light Editor Preview](https://raw.githubusercontent.com/xulbux/vscode-ext-color-tracr/main/assets/preview/css-light.png)](https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/css-light.png)

### TypeScript

[![TypeScript · Dark Editor Preview](https://raw.githubusercontent.com/xulbux/vscode-ext-color-tracr/main/assets/preview/ts-dark.png)](https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/ts-dark.png)

[![TypeScript · Light Editor Preview](https://raw.githubusercontent.com/xulbux/vscode-ext-color-tracr/main/assets/preview/ts-light.png)](https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/ts-light.png)

### React

[![React · Dark Editor Preview](https://raw.githubusercontent.com/xulbux/vscode-ext-color-tracr/main/assets/preview/tsx-dark.png)](https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/tsx-dark.png)

[![React · Light Editor Preview](https://raw.githubusercontent.com/xulbux/vscode-ext-color-tracr/main/assets/preview/tsx-light.png)](https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/tsx-light.png)

<br>
<br>
<br>

## <a href="#troubleshooting"><img src="https://svg.xul.is/icon/bug?size=32&stroke=2" align="left" /></a>Troubleshooting

If Color Tracr isn't marking colors the way you expect (or isn't working at all), check its log output:

1.  Open the **Output** panel (menu **View → Output**, or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>U</kbd>).
2.  Select **Color Tracr** from the dropdown in the top-right of the panel. **<span style="color:#97F">\*</span>**

Any errors or warnings (e.g., a Tailwind config that failed to load) are reported there.

> **<span style="color:#97F">\*</span>** If Color Tracr does **not** appear in the dropdown, that means nothing went wrong;<br>
> &nbsp;&nbsp;&nbsp;The channel is only created when there is an error or warning to report.

<br>
<br>
<br>

## Enjoying this extension?&numsp;Have suggestions?

Please consider giving a [![star](https://svg.xul.is/icon/star?size=20&anim=shake)](https://github.com/xulbux/vscode-ext-color-tracr) on [**GitHub**](https://github.com/xulbux/vscode-ext-color-tracr) or leaving a review on [**Open VSX**](https://open-vsx.org/extension/xulbux/color-tracr) or the [**Visual Studio Marketplace**](https://marketplace.visualstudio.com/items?itemName=xulbux.color-tracr).

<br>

## Acknowledgments

This extension was heavily inspired by the excellent [color-highlight](https://github.com/iamsergii/vscode-ext-color-highlight) extension by [Sergii Naumov](https://github.com/iamsergii).<br>
Color Tracr aims to build upon that concept with modern web format support and a high-performance, minimal-footprint architecture.

<br>
<br>
<br>

---

[![](https://svg.xul.is/icon/sparkles?size=20)](https://xulbux.com) Always creating more cool stuff for you! [![](https://svg.xul.is/icon/sparkles?size=20)](https://xulbux.com)&emsp;—&numsp;[**XulbuX**](https://xulbux.com)
