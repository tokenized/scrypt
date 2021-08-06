const { expect } = require('chai');
const { bsv, getPreimage, Bytes } = require('scryptlib');
const { getOutputsHex, buildContract } = require('./helper.js');

const inputIndex = 0;
const inputSatoshis = 100000;
const outputScript = "76a9140f68389668c7e680d62e2446866ea1ca668e7fa188ac";
const outputAmount = 2005;

describe('Test EnforceOutputScriptValue', () => {
  let contract, result;

  before(() => {
    const EnforceOutputScriptValue = buildContract('enforce_output_script_value.scrypt');
    contract = new EnforceOutputScriptValue(new Bytes(outputScript), outputAmount);
  });

  it('Call with valid inputs', () => {
    const tx = createTx(outputAmount);
    const preimage = getPreimage(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
    const outputsHex = getOutputsHex(tx);

    // const unlockScript = new bsv.Script();
    // unlockScript.add(Buffer.from(outputsHex, 'hex'));
    // unlockScript.add(Buffer.from(preimage.toString('hex'), 'hex'));
    // tx.inputs[0].setScript(unlockScript);
    // console.log("unlock script : " + unlockScript.toHex());

    contract.txContext = { tx, inputIndex, inputSatoshis };

    console.log("contract script : " + contract.lockingScript.toHex());
    console.log("tx : " + tx);
    console.log("preimage : " + preimage.toString('hex'));
    console.log("outputs : " + outputsHex);

    const res = contract.unlock(new Bytes(outputsHex), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.true;
  });

  it('Call with invalid inputs', () => {
    const tx = createTx(outputAmount+1);
    const preimage = getPreimage(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
    const outputsHex = getOutputsHex(tx);

    // const unlockScript = new bsv.Script();
    // unlockScript.add(Buffer.from(outputsHex, 'hex'));
    // unlockScript.add(Buffer.from(preimage.toString('hex'), 'hex'));
    // tx.inputs[0].setScript(unlockScript);
    // console.log("unlock script : " + unlockScript.toHex());

    contract.txContext = { tx, inputIndex, inputSatoshis };

    console.log("contract script : " + contract.lockingScript.toHex());
    console.log("tx : " + tx);
    console.log("preimage : " + preimage.toString('hex'));
    console.log("outputs : " + outputsHex);

    const res = contract.unlock(new Bytes(outputsHex), preimage);
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
