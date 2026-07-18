import{V as a}from"./index-Dy1HpS6o.js";function e(r){return a(r.enteredAt,r.completedAt)}function n(r=[]){return r.map(t=>`${t.label}: ${t.slaTarget||"-"}`).join(`
`)}function l(r=[]){return r.map(t=>`${t.label}: ${e(t)}`).join(`
`)}function o(r=[]){return r.map(t=>`${t.label}｜SLA ${t.slaTarget||"-"}｜耗时 ${e(t)}｜进入 ${t.enteredAt||"-"}｜完成 ${t.completedAt||"-"}`).join(`
`)}function u(r){return e(r)}export{l as a,o as b,n as c,u as g};
