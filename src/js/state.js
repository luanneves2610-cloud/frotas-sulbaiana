export let C = { v:[], ct:[], loc:[], cc:[], a:[], m:[], u:[], mt:[], vd:[], mov:[] };
export let SESSION = null;

export function setSession(s) { SESSION = s; }
export function clearSession() { SESSION = null; }
export function setC(key, val) { C[key] = val; }
export function resetC() {
  C = { v:[], ct:[], loc:[], cc:[], a:[], m:[], u:[], mt:[], vd:[], mov:[] };
}
