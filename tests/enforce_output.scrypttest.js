const { expect } = require('chai');
const { bsv, getPreimage, buildContractClass, Ripemd160, Sig, PubKey, Bytes, num2bin, toHex, compileContract: compileContractImpl } = require('scryptlib');
const path = require('path')

const inputIndex = 0;
const inputSatoshis = 100000;
const outputScript = "76a9140f68389668c7e680d62e2446866ea1ca668e7fa188ac";
const outputAmount = 2005;

describe('Test EnforceOutput', () => {
  let enforceOutput, result;

  before(() => {
    const EnforceOutput = buildContractClass(compileContract('enforce_output.scrypt'));
    enforceOutput = new EnforceOutput(new Bytes(outputScript), outputAmount);
  });

  it('Call EnforceOutput with valid inputs', () => {
    const tx = createTx(outputAmount);
    const preimage = getPreimage(tx, enforceOutput.lockingScript.toASM(), inputSatoshis, inputIndex);
    const outputsHex = GetOutputsHex(tx);

    // const unlockScript = new bsv.Script();
    // unlockScript.add(Buffer.from(outputsHex, 'hex'));
    // unlockScript.add(Buffer.from(preimage.toString('hex'), 'hex'));
    // tx.inputs[0].setScript(unlockScript);
    // console.log("unlock script : " + unlockScript.toHex());

    enforceOutput.txContext = { tx, inputIndex, inputSatoshis };

    console.log("contract script : " + enforceOutput.lockingScript.toHex());
    console.log("tx : " + tx);
    console.log("preimage : " + preimage.toString('hex'));
    console.log("outputs : " + outputsHex);

    const res = enforceOutput.unlock(new Bytes(outputsHex), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.true;
  });

  it('Call EnforceOutput with invalid inputs', () => {
    const tx = createTx(outputAmount+1);
    const preimage = getPreimage(tx, enforceOutput.lockingScript.toASM(), inputSatoshis, inputIndex);
    const outputsHex = GetOutputsHex(tx);

    // const unlockScript = new bsv.Script();
    // unlockScript.add(Buffer.from(outputsHex, 'hex'));
    // unlockScript.add(Buffer.from(preimage.toString('hex'), 'hex'));
    // tx.inputs[0].setScript(unlockScript);
    // console.log("unlock script : " + unlockScript.toHex());

    enforceOutput.txContext = { tx, inputIndex, inputSatoshis };

    console.log("contract script : " + enforceOutput.lockingScript.toHex());
    console.log("tx : " + tx);
    console.log("preimage : " + preimage.toString('hex'));
    console.log("outputs : " + outputsHex);

    const res = enforceOutput.unlock(new Bytes(outputsHex), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

});

function createTx(payAmount) {
    const result = new bsv.Transaction();

    result.addInput(new bsv.Transaction.Input({
      prevTxId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
      outputIndex: 0,
      script: ''
    }), '', inputSatoshis);

    result.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromHex(outputScript),
      satoshis: payAmount,
    }));

    return result;
}

function GetOutputsHex(tx, n) {
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

function compileContract(fileName, options) {
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

  return result;
}
