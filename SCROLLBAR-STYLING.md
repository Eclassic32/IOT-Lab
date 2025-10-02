# Cross-Browser Scrollbar Styling

## Browser Compatibility

### ✅ Webkit Browsers (Chrome, Edge, Safari, Opera)
Uses the `::-webkit-scrollbar` pseudo-elements for detailed customization.

**Properties available:**
- `::-webkit-scrollbar` - The entire scrollbar
- `::-webkit-scrollbar-track` - The track (background)
- `::-webkit-scrollbar-thumb` - The draggable handle
- `::-webkit-scrollbar-thumb:hover` - Hover state

**Example:**
```css
.element::-webkit-scrollbar { 
    width: 8px; 
}
.element::-webkit-scrollbar-track { 
    background: rgba(255,255,255,0.06); 
    border-radius: 4px; 
}
.element::-webkit-scrollbar-thumb { 
    background: linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%);
    border-radius: 4px; 
}
```

### ✅ Firefox
Uses standard CSS properties (part of CSS Scrollbars Module Level 1).

**Properties available:**
- `scrollbar-width` - Width of scrollbar (auto, thin, or none)
- `scrollbar-color` - Colors for thumb and track

**Example:**
```css
.element {
    scrollbar-width: thin;
    scrollbar-color: var(--brand) rgba(255,255,255,0.06);
    /*                 ↑ thumb      ↑ track              */
}
```

### ❌ Limited Support
- **Internet Explorer**: Limited support, uses `-ms-` prefixed properties (deprecated)
- **Older browsers**: May show default OS scrollbars

## Implementation in This Project

### 1. Body Scrollbar
```css
body {
    /* Firefox */
    scrollbar-width: thin;
    scrollbar-color: var(--brand) var(--bg-grad-start);
}

/* Webkit */
body::-webkit-scrollbar { width: 10px; }
body::-webkit-scrollbar-thumb { 
    background: linear-gradient(180deg, var(--brand) 0%, var(--brand-strong) 100%);
}
```

### 2. Logs List Scrollbar
```css
#logs-list {
    /* Firefox */
    scrollbar-width: thin;
    scrollbar-color: var(--brand) rgba(255,255,255,0.06);
}

/* Webkit */
#logs-list::-webkit-scrollbar { width: 8px; }
```

### 3. Modal Body Scrollbar
```css
.modal-body {
    /* Firefox */
    scrollbar-width: thin;
    scrollbar-color: var(--brand) rgba(255,255,255,0.06);
}

/* Webkit */
.modal-body::-webkit-scrollbar { width: 8px; }
```

## Color Variables Used

- `var(--brand)` - Primary brand color (#60a5fa in dark mode, #2563eb in light mode)
- `var(--brand-strong)` - Stronger brand color (#3b82f6 in dark mode, #1d4ed8 in light mode)
- `var(--bg-grad-start)` - Background gradient start color
- `var(--surface)` - Surface color for cards
- `var(--surface-strong)` - Stronger surface color

## Testing

### Chrome/Edge/Safari
- Should see gradient blue scrollbars
- Rounded corners on thumb
- Smooth hover effect (inverted gradient)
- 8-10px width depending on element

### Firefox
- Should see thin blue scrollbars
- Native Firefox scrollbar appearance with blue coloring
- No gradients (limitation of Firefox's implementation)
- Thumb uses solid `var(--brand)` color

### Test Instructions
1. Open the application in both Chrome and Firefox
2. Scroll the main page (body)
3. Open the logs section and scroll
4. Open the configuration modal and scroll (if content is long)
5. Verify scrollbars match the brand color scheme in both browsers

## Resources

- [MDN: CSS Scrollbars](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Scrollbars)
- [MDN: ::-webkit-scrollbar](https://developer.mozilla.org/en-US/docs/Web/CSS/::-webkit-scrollbar)
- [Can I Use: CSS Scrollbars](https://caniuse.com/css-scrollbar)
