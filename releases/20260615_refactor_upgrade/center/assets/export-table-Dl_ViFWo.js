import{h as p}from"./index-Dy1HpS6o.js";/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=p("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=p("Settings2",[["path",{d:"M20 7h-9",key:"3s1dr2"}],["path",{d:"M14 17H5",key:"gfn3mx"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]]);function o(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function b(t,n){return t.map((a,c)=>{const r=n.reduce((l,i)=>{const d=String(i[c]??"").replace(/\s+/g," ").length;return Math.max(l,d)},a.length);return Math.max(10,Math.min(36,r+2))*9})}function k({title:t,filename:n,headers:a,rows:c,note:r}){const l=b(a,c).map(e=>`<col style="width:${e}px" />`).join(""),i=a.map(e=>`<th>${o(e)}</th>`).join(""),d=c.map(e=>`<tr>${e.map(x=>`<td>${o(x)}</td>`).join("")}</tr>`).join(""),f=new Date().toLocaleString("zh-CN"),m=`\uFEFF
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif; padding: 18px; color: #0f172a; }
        .report-title { font-size: 20px; font-weight: 700; margin: 0 0 6px; color: #0f172a; }
        .report-meta { font-size: 12px; color: #64748b; margin: 0 0 14px; }
        .report-note { font-size: 12px; color: #475569; margin: 0 0 14px; }
        table { border-collapse: collapse; width: auto; min-width: 100%; table-layout: fixed; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; vertical-align: top; word-break: break-word; }
        th { background: #dbeafe; color: #0f172a; font-weight: 700; text-align: left; }
        tr:nth-child(even) td { background: #f8fafc; }
        tr:hover td { background: #eff6ff; }
      </style>
    </head>
    <body>
      <div class="report-title">${o(t)}</div>
      <div class="report-meta">导出时间：${o(f)}</div>
      ${r?`<div class="report-note">${o(r)}</div>`:""}
      <table>
        <colgroup>${l}</colgroup>
        <thead><tr>${i}</tr></thead>
        <tbody>${d}</tbody>
      </table>
    </body>
  </html>`,g=new Blob([m],{type:"application/vnd.ms-excel;charset=utf-8;"}),s=document.createElement("a");s.href=URL.createObjectURL(g),s.download=n,s.click()}export{y as R,w as S,k as d};
