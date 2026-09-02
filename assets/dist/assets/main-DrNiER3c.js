import{t as e}from"./virtualRef-BXDDmgQA.js";import{t}from"./logger-CvF98D4V.js";import{t as n}from"./windpress-DeFkqy8G.js";var r=`#oxygen-topbar .oxygen-toolbar-menus:has(.oxygen-dom-tree-button)`,i=document.createRange().createContextualFragment(`
    <div class="windpressoxygen-settings-button">
        ${n}
    </div>
`),{getVirtualRef:a}=e({},{persist:`windpress.ui.state`}),o=document.querySelector(r);o.insertBefore(i,o.firstChild),window.tippy(`.windpressoxygen-settings-button`,{content:`WindPress is detected`,animation:`shift-toward`,placement:`bottom`}),document.querySelector(`.windpressoxygen-settings-button`),t(`Module loaded!`,{module:`settings`});