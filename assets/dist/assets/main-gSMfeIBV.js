import{t as e}from"./virtualRef-BXDDmgQA.js";import{t}from"./logger-CvF98D4V.js";import{t as n}from"./windpress-DeFkqy8G.js";var r=document.createRange().createContextualFragment(`
    <button id="windpressbuilderius-settings-navbar" data-tooltip-content="WindPress — Builderius settings" data-tooltip-place="bottom" class="uniPanelButton">
        <span class="">
            ${n}
        </span>
    </button>
`),{getVirtualRef:i}=e({},{persist:`windpress.ui.state`});document.querySelector(`.uniTopPanel__rightCol`).prepend(r);var a=document.querySelector(`#windpressbuilderius-settings-navbar`);function o(){let e=i(`window.minimized`,!1).value;i(`window.minimized`,!1).value=!e,e?a.classList.add(`active`):a.classList.remove(`active`)}a.addEventListener(`click`,e=>{o()}),t(`Module loaded!`,{module:`settings`});