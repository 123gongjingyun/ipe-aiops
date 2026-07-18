import{h as s,j as e,O as b,Q as u,R as k,S as y,U as j,a1 as f}from"./index-Dy1HpS6o.js";import{R as v}from"./export-table-Dl_ViFWo.js";/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q=s("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=s("FileDown",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M12 18v-6",key:"17g6i2"}],["path",{d:"m9 15 3 3 3-3",key:"1npd3o"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=s("Package",[["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}],["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=s("SquareCheckBig",[["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}],["path",{d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",key:"1jnkn4"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=s("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);function L({open:d,title:n,description:o,items:t,selectedMap:r,onOpenChange:l,onToggle:c,onReset:i,onSelectAll:x,onClear:h,onConfirm:m}){const p=t.filter(a=>r[a.key]).length;return e.jsx(b,{open:d,onOpenChange:l,children:e.jsxs(u,{className:"max-w-3xl",children:[e.jsxs(k,{children:[e.jsx(y,{children:n}),e.jsx(j,{children:o})]}),e.jsxs("div",{className:"rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600",children:["已选择 ",p," / ",t.length," 项"]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsxs("button",{onClick:i,className:"inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted",children:[e.jsx(v,{className:"h-3 w-3"})," 恢复默认"]}),e.jsxs("button",{onClick:x,className:"inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted",children:[e.jsx(N,{className:"h-3 w-3"})," 全选"]}),e.jsxs("button",{onClick:h,className:"inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted",children:[e.jsx(C,{className:"h-3 w-3"})," 清空"]})]}),e.jsx("div",{className:"grid max-h-[440px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3",children:t.map(a=>{const g=r[a.key];return e.jsxs("label",{className:"flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300",children:[e.jsx(f,{checked:g,onCheckedChange:()=>c(a.key)}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("div",{className:"truncate text-sm font-medium text-slate-900",children:a.label}),a.meta?e.jsx("div",{className:"mt-0.5 truncate text-[11px] text-slate-500",children:a.meta}):null]})]},a.key)})}),e.jsxs("div",{className:"flex items-center justify-end gap-2",children:[e.jsx("button",{onClick:()=>l(!1),className:"rounded-md border border-border px-3 py-2 text-sm hover:bg-muted",children:"取消"}),e.jsx("button",{onClick:m,className:"rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-primary/90",children:"确认"})]})]})})}export{q as C,S as F,M as P,L as a};
