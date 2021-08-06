
const { toHex, buildContractClass, compileContract: compileContractImpl } = require('scryptlib');
const path = require('path')

function getOutputsHex(tx, n) {
    let writer;
  
    if(!n) {
      for(let output of tx.outputs) {
        if(writer) {
          output.toBufferWriter(writer);
        } else {
          writer = output.toBufferWriter();
        }
      }
    } else {
      writer = tx.outputs[n].toBufferWriter();
    }
  
    return toHex(writer.toBuffer());
}
  
function buildContract(fileName, options) {
    const basePath = "/" + path.join(...__dirname.split("/").slice(0, -1));
    const filePath = path.join(basePath, 'contracts', fileName);
    const out = path.join(basePath, 'deployments', 'fixture', 'autoGen');
  
    const result = compileContractImpl(filePath, options ? options : {
      out: out
    });
    if(result.errors.length > 0) {
      console.log(`Compile contract ${filePath} fail: `, result.errors);
      throw result.errors;
    }
  
    return buildContractClass(result);
}

module.exports = { getOutputsHex, buildContract };