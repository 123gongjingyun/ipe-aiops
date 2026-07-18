import{e as v,r as u,t as j,v as w,j as e,C as y,a as N,u as k,B as S}from"./index-Bt6PAe0q.js";import{S as $,b as C,a as O}from"./status-badge-DEVdS5Kw.js";import"./badge-19BBJP09.js";/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=v("FileDown",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M12 18v-6",key:"17g6i2"}],["path",{d:"m9 15 3 3 3-3",key:"1npd3o"}]]);function m(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function z(s,t){return s.map((o,r)=>{const n=t.reduce((a,l)=>{const c=String(l[r]??"").replace(/\s+/g," ").length;return Math.max(a,c)},o.length);return Math.max(10,Math.min(36,n+2))*9})}function M({title:s,filename:t,headers:o,rows:r,note:n}){const a=z(o,r).map(d=>`<col style="width:${d}px" />`).join(""),l=o.map(d=>`<th>${m(d)}</th>`).join(""),c=r.map(d=>`<tr>${d.map(b=>`<td>${m(b)}</td>`).join("")}</tr>`).join(""),x=new Date().toLocaleString("zh-CN"),h=`\uFEFF
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
      <div class="report-title">${m(s)}</div>
      <div class="report-meta">导出时间：${m(x)}</div>
      ${n?`<div class="report-note">${m(n)}</div>`:""}
      <table>
        <colgroup>${a}</colgroup>
        <thead><tr>${l}</tr></thead>
        <tbody>${c}</tbody>
      </table>
    </body>
  </html>`,g=new Blob([h],{type:"application/vnd.ms-excel;charset=utf-8;"}),f=document.createElement("a");f.href=URL.createObjectURL(g),f.download=t,f.click()}function E(s){const[t,o]=u.useState([]),r=u.useCallback(()=>{o(j())},[]);return u.useEffect(()=>(r(),w(r)),[r]),{orders:s?t.filter(i=>i.status===s):t,allOrders:t,refresh:r}}function F({order:s,onClick:t}){return e.jsx(y,{className:"cursor-pointer hover:border-border-hover transition-colors ",onClick:t,children:e.jsxs(N,{className:"p-4",children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("span",{className:"text-sm font-mono text-primary",children:s.id}),e.jsx($,{status:s.status})]}),e.jsx("div",{className:"font-medium text-sm mb-1",children:s.comboName}),e.jsxs("div",{className:"flex items-center justify-between text-xs text-muted-foreground",children:[e.jsxs("span",{children:[s.services.length," 个服务"]}),e.jsx("span",{children:s.createdAt})]})]})})}const p=[{value:"all",label:"全部"},{value:"pending",label:"待处理"},{value:"reviewing",label:"评审中"},{value:"processing",label:"处理中"},{value:"plan_confirming",label:"待确认方案"},{value:"delivering",label:"交付中"},{value:"completed",label:"已完成"},{value:"confirmed",label:"已验收"}];function T(){const s=k(),[t,o]=u.useState("all"),{orders:r}=E(t==="all"?void 0:t),n=u.useMemo(()=>r,[r]),i=()=>{var a;M({title:"我的申请导出",filename:`我的申请_${new Date().toLocaleDateString("zh-CN")}.xls`,note:`导出范围：${t==="all"?"全部申请":((a=p.find(l=>l.value===t))==null?void 0:a.label)||t}。包含当前筛选结果的工单状态、服务清单、节点 SLA 与耗时摘要。`,headers:["工单编号","服务组合","当前状态","服务数量","服务清单","创建时间","节点SLA摘要","节点耗时摘要"],rows:n.map(l=>{var c;return[l.id,l.comboName,((c=p.find(x=>x.value===l.status))==null?void 0:c.label)||l.status,l.services.length,l.services.join(" / "),l.createdAt,C(l.workflowTimeline??[]),O(l.workflowTimeline??[])]})})};return e.jsxs("div",{children:[e.jsxs("div",{className:"mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-xl font-semibold",children:"我的申请"}),e.jsx("p",{className:"mt-1 text-sm text-muted-foreground",children:"查看我提交的全部申请，按状态筛选，并将当前结果导出为适合汇报的表格。"})]}),e.jsxs(S,{variant:"outline",size:"sm",onClick:i,disabled:n.length===0,children:[e.jsx(L,{className:"mr-1.5 h-4 w-4"}),"导出当前筛选"]})]}),e.jsxs("div",{className:"flex items-center justify-between gap-3 mb-6 flex-wrap",children:[e.jsx("div",{className:"flex gap-1 flex-wrap",children:p.map(a=>e.jsx("button",{onClick:()=>o(a.value),className:`px-3 py-1.5 text-xs rounded-md transition-colors ${t===a.value?"bg-primary text-white":"bg-muted text-muted-foreground hover:text-foreground"}`,children:a.label},a.value))}),e.jsxs("div",{className:"rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground",children:["当前 ",n.length," 条"]})]}),r.length===0?e.jsx("div",{className:"text-sm text-muted-foreground py-12 text-center bg-muted/30 rounded-lg",children:"暂无申请记录"}):e.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",children:r.map(a=>e.jsx(F,{order:a,onClick:()=>s(`/order/${a.id}`)},a.id))})]})}export{T as Orders};
