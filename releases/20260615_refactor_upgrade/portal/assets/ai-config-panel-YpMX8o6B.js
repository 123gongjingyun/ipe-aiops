import{e as t,j as e,C as m,k as x,l as o,a as h}from"./index-Bt6PAe0q.js";import{B as p}from"./badge-19BBJP09.js";/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=t("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=t("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=t("Layers",[["path",{d:"m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z",key:"8b97xw"}],["path",{d:"m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65",key:"dd6zsq"}],["path",{d:"m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65",key:"ep9fru"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=t("Network",[["rect",{x:"16",y:"16",width:"6",height:"6",rx:"1",key:"4q2zg0"}],["rect",{x:"2",y:"16",width:"6",height:"6",rx:"1",key:"8cvhb9"}],["rect",{x:"9",y:"2",width:"6",height:"6",rx:"1",key:"1egb70"}],["path",{d:"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3",key:"1jsf9p"}],["path",{d:"M12 12V8",key:"2874zd"}]]);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=t("Server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]),j={vm:{label:"计算",icon:u,accent:"bg-info-light text-info border-info/20"},db:{label:"数据库",icon:g,accent:"bg-warning-light text-warning border-warning/20"},network:{label:"网络",icon:b,accent:"bg-success-light text-success border-success/20"},paas:{label:"PaaS",icon:k,accent:"bg-primary/10 text-primary border-primary/20"},middleware:{label:"中间件",icon:y,accent:"bg-error-light text-error border-error/20"}},v={monitor:"监控",logging:"日志",backup:"备份",security:"安全",pam:"PAM"};function w({plan:s,title:n="AI 推荐配置"}){return e.jsxs(m,{children:[e.jsxs(x,{className:"pb-3",children:[e.jsx(o,{className:"text-base",children:n}),e.jsx("p",{className:"text-sm text-muted-foreground",children:s.summary}),e.jsxs("p",{className:"text-xs text-muted-foreground",children:["预计 ",s.estimatedTime]})]}),e.jsx(h,{children:e.jsxs("div",{className:"space-y-4",children:[s.resources.length>0&&e.jsxs("div",{children:[e.jsx("div",{className:"text-sm font-medium mb-2",children:"资源需求"}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:s.resources.map((a,r)=>{const d=j[a.type],i=d.icon;return e.jsxs("div",{className:"rounded-md border bg-card p-3",children:[e.jsx("div",{className:"flex items-center gap-2 mb-2",children:e.jsxs("span",{className:`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${d.accent}`,children:[e.jsx(i,{className:"h-3 w-3"}),d.label]})}),e.jsx("div",{className:"text-sm font-medium leading-snug",children:a.name}),e.jsx("div",{className:"text-xs text-muted-foreground mt-0.5 mb-2",children:a.purpose}),e.jsx("div",{className:"flex flex-wrap gap-x-3 gap-y-1",children:Object.entries(a.spec).map(([c,l])=>e.jsxs("span",{className:"text-xs",children:[e.jsx("span",{className:"text-muted-foreground",children:c}),e.jsx("span",{className:"ml-1 font-medium text-foreground",children:l})]},c))})]},r)})})]}),s.integrations.length>0&&e.jsxs("div",{children:[e.jsx("div",{className:"text-sm font-medium mb-2",children:"集成服务"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:s.integrations.map((a,r)=>e.jsxs(p,{variant:a.enabled?"success":"secondary",className:"text-xs",children:[v[a.type]??a.type,a.enabled?" ✓":" ✗"]},r))})]})]})})]})}export{w as A,y as B,g as D,k as L,b as N,u as S};
