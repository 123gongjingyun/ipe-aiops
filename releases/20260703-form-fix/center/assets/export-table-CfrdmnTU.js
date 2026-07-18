function o(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function x(t,c){return t.map((a,r)=>{const n=c.reduce((l,i)=>{const d=String(i[r]??"").replace(/\s+/g," ").length;return Math.max(l,d)},a.length);return Math.max(10,Math.min(36,n+2))*9})}function b({title:t,filename:c,headers:a,rows:r,note:n}){const l=x(a,r).map(e=>`<col style="width:${e}px" />`).join(""),i=a.map(e=>`<th>${o(e)}</th>`).join(""),d=r.map(e=>`<tr>${e.map(g=>`<td>${o(g)}</td>`).join("")}</tr>`).join(""),f=new Date().toLocaleString("zh-CN"),h=`\uFEFF
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
      ${n?`<div class="report-note">${o(n)}</div>`:""}
      <table>
        <colgroup>${l}</colgroup>
        <thead><tr>${i}</tr></thead>
        <tbody>${d}</tbody>
      </table>
    </body>
  </html>`,m=new Blob([h],{type:"application/vnd.ms-excel;charset=utf-8;"}),s=document.createElement("a");s.href=URL.createObjectURL(m),s.download=c,s.click()}export{b as d};
