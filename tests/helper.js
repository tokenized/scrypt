
const { bsv, toHex, buildContractClass, compileContract: compileContractImpl, getPreimage } = require('scryptlib');
const path = require('path')

const MSB_THRESHOLD = 0x7e;

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

// fixLowS increments the first input's sequence number until the sig hash is safe for low s.
function fixLowS(tx, lockingScript, inputSatoshis, inputIndex, sigHashType = 0x41) {
  for (i=0;i<25;i++) {
    const preimage = getPreimage(tx, lockingScript, inputSatoshis, inputIndex, sigHashType);
    const sighash = bsv.crypto.Hash.sha256sha256(Buffer.from(toHex(preimage), 'hex'));
    console.log("fix sighash : " + sighash.toString('hex'));
    const msb = sighash.readUInt8();
    if (msb < MSB_THRESHOLD) {
      return;
    }
    tx.inputs[0].sequenceNumber++;
  }
}

// checkLowS returns true if the sig hash is safe for low s.
function checkLowS(tx, lockingScript, inputSatoshis, inputIndex, sigHashType = 0x41) {
  const preimage = getPreimage(tx, lockingScript, inputSatoshis, inputIndex, sigHashType);
  const sighash = bsv.crypto.Hash.sha256sha256(Buffer.from(toHex(preimage), 'hex'));
  console.log("check sighash : " + sighash.toString('hex'));
  const msb = sighash.readUInt8();
  return (msb < MSB_THRESHOLD);
}

module.exports = { getOutputsHex, buildContract, fixLowS, checkLowS };