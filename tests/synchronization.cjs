// Regressões de estado compartilhado; executa com node tests/synchronization.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const rx = require('rxjs');

function load(file, name) {
  const exports = {};
  const core = new Proxy({ EventEmitter: class { emit() {} } }, {
    get: (target, key) => target[key] || (() => () => {}),
  });
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports, require: id => id === 'rxjs' ? rx : id === '@angular/core' ? core : { PIPES: [] },
    window: { location: { hostname: 'localhost' }, innerWidth: 1280 },
    console, setTimeout, clearTimeout,
  }, { filename: file });
  return exports[name];
}

async function main() {
  const Api = load('src/app/api.service.ts', 'ApiService');
  const Data = load('src/app/data.service.ts', 'DataService');
  const Agenda = load('src/app/screens/agenda.component.ts', 'AgendaComponent');
  const writes = [];
  let bootstraps = 0;
  const http = {
    post: (url, body) => { const response = new rx.Subject(); writes.push({ url, body, response }); return response; },
    put: (url, body) => http.post(url, body),
    get: () => { bootstraps++; return rx.of({ hoje: [], agendamentos: [], kpis: { agendamentos: 99 } }); },
  };
  const api = new Api(http);
  const data = new Data(api, { error() {} }, { restore: async () => {} });
  data.hoje.length = data.agendamentos.length = 0;
  const agenda = new Agenda(data, { nativeElement: {} });
  agenda.appts = data.hoje;
  for (let i = 0; i < 2; i++) data.persistAppt({ id: `test${i}`, cli: 'c1', srv: 's1', prof: 'p1', ini: '10:30', sinal: false });
  assert.ok(data.hoje.every(a => a.status === 'pendente'));
  assert.ok(data.agendamentos.every(a => a.status === 'pendente'));
  assert.ok(writes.every(w => w.body.status === 'pendente'), 'Novo agendamento persiste como pendente');
  assert.equal(agenda.dayAppts.length, 2);
  const di = agenda.diasDatas.indexOf(data.hojeData);
  assert.ok(di >= 0, 'Todos os dias, inclusive domingo, pertencem à semana');
  assert.equal(agenda.semanaSlotAppts(di, '10:00').length, 2);
  assert.equal(agenda.semanaSlotAppts(di, '09:00').length, 0, 'Sem duplicação entre intervalos');
  const day = Number(data.hojeData.slice(-2));
  assert.equal(agenda.mesCnt(day), 2);
  agenda.profFilter = 'p2';
  assert.equal(agenda.mesCnt(day), 0);
  assert.equal(agenda.semanaSlotAppts(di, '10:00').length, 0);
  agenda.profFilter = 'todos';
  agenda.listStatusF = 'pendente';
  assert.equal(agenda.rows.length, 2);
  data.setApptStatus('test0', 'cancelado');
  assert.equal(agenda.rows.length, 1, 'Cache invalida sem alterar quantidade');
  agenda.statusFilter = 'cancelado';
  assert.equal(agenda.mesCnt(day), 1);
  assert.equal(agenda.semanaSlotAppts(di, '10:00').length, 1);
  data.updateAppt('test1', { data: '2099-01-01' });
  assert.equal(data.hoje.length, 1);
  data.updateAppt('test1', { data: data.hojeData });
  assert.equal(data.hoje.length, 2, 'Remarcação de volta para hoje restaura timeline');
  assert.equal(writes[0].body.data, data.hojeData, 'Criação usa data local explícita');
  writes[0].response.complete();
  await new Promise(resolve => setTimeout(resolve, 140));
  assert.equal(bootstraps, 0, 'Não recarrega no meio de gravações relacionadas');
  for (const w of writes.slice(1)) w.response.complete();
  await new Promise(resolve => setTimeout(resolve, 140));
  assert.equal(bootstraps, 1);
  assert.equal(data.kpis.agendamentos, 99, 'Indicadores recebem dados atualizados');
  assert.equal(agenda.dayAppts.length, 0, 'Timeline mantém referência após recarga');
  assert.equal(agenda.rows.length, 0, 'Lista invalida após recarga');
  const failed = api.post('/produtos', {}).subscribe({ error() {} });
  writes.at(-1).response.error(new Error('Gravação rejeitada'));
  await new Promise(resolve => setTimeout(resolve, 140));
  assert.equal(bootstraps, 2, 'Falhas também reconciliam o estado com o servidor');
  failed.unsubscribe();
  console.log('OK: criação, dia/semana/mês, filtros, cache, remarcação e reconciliação global.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
