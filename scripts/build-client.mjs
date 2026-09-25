import ts from 'typescript'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const [panelSource,clientSource,css]=await Promise.all([
  readFile(resolve(root,'src/main-panel-compat.ts'),'utf8'),
  readFile(resolve(root,'src/client.tsx'),'utf8'),
  readFile(resolve(root,'src/client.css'),'utf8'),
])

// Harness does not execute a normal ESM client entry. It downloads several
// plugin files together and requires every file to register itself through
// window.__ModuleLoader__. Keep our internal modules and CSS in one registered
// payload so a failure here cannot break the modules loaded after this plugin.
const source=`
import React,{useEffect,useMemo,useState} from 'react'
const clientCss=${JSON.stringify(css)}
${withoutImports(panelSource)}
${withoutImports(clientSource)}
`
const result=ts.transpileModule(source,{
  fileName:'client.tsx',
  reportDiagnostics:true,
  compilerOptions:{
    target:ts.ScriptTarget.ES2022,
    module:ts.ModuleKind.CommonJS,
    jsx:ts.JsxEmit.ReactJSX,
    esModuleInterop:true,
  },
})
const errors=(result.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error)
if(errors.length)throw new Error(ts.formatDiagnostics(errors,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>root,getNewLine:()=>"\n"}))

const wrapped=`window.__ModuleLoader__.load({
  id: "dsh-wrong-question",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${indent(result.outputText,4)}
    return module.exports;
  }
});
`
await mkdir(resolve(root,'lib'),{recursive:true})
await writeFile(resolve(root,'lib/client.js'),wrapped,'utf8')

function withoutImports(value){return value.replace(/^import[^\n]*\n/gm,'')}
function indent(value,size){const prefix=' '.repeat(size);return value.split('\n').map(line=>prefix+line).join('\n')}
