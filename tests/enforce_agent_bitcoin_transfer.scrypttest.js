const { expect } = require('chai');
const { bsv, signTx, getPreimage, toHex, num2bin, Bytes, PubKey, Sig, Sha256, Ripemd160 } = require('scryptlib');
const { buildContract, fixLowS, checkLowS } = require('./helper.js');

const inputIndex = 0;
const inputSatoshis = 100000;
const agentKey = new bsv.PrivateKey.fromRandom('testnet');
const approveOutputBytes = "d3070000000000001976a9140f68389668c7e680d62e2446866ea1ca668e7fa188ac";
const approveOutputScript = "76a9140f68389668c7e680d62e2446866ea1ca668e7fa188ac";
const refundOutputBytes = "d3070000000000001976a9148c5a40d16db46e3fc419fd26105bb159cd2863b788ac";
const refundOutputScript = "76a9148c5a40d16db46e3fc419fd26105bb159cd2863b788ac";
const expireKey = new bsv.PrivateKey.fromRandom('testnet');
const expiration = 610000;
const outputAmount = 2003;
const wrongLockScript = "76a91486ead68829c1249844758bb3169ee19c4263c5cd88ac";
const wrongKey = new bsv.PrivateKey.fromRandom('testnet');
const asmVarsAll = {'Tx.checkPreimageOpt_.sigHashType': '41'};
const asmVarsSingle = {'Tx.checkPreimageOpt_.sigHashType': '43'};
let EnforceAgentBitcoinTransfer;
let agentKeyHash, approveOutputsHash, refundOutputsHash, expireKeyHash;

describe('Test EnforceAgentBitcoinTransfer', () => {
  let contractAll, contractSingle, result;

  before(() => {
    EnforceAgentBitcoinTransfer = buildContract('enforce_agent_bitcoin_transfer.scrypt');
    console.log("Contract built");
    agentKeyHash = new Ripemd160(toHex(bsv.crypto.Hash.sha256ripemd160(agentKey.publicKey.toBuffer())));
    approveOutputsHash = new Sha256(toHex(bsv.crypto.Hash.sha256sha256(Buffer.from(approveOutputBytes, 'hex'))));
    refundOutputsHash = new Sha256(toHex(bsv.crypto.Hash.sha256sha256(Buffer.from(refundOutputBytes, 'hex'))));
    expireKeyHash = new Ripemd160(toHex(bsv.crypto.Hash.sha256ripemd160(expireKey.publicKey.toBuffer())));
    contractSingle = new EnforceAgentBitcoinTransfer(agentKeyHash, approveOutputsHash, refundOutputsHash, expireKeyHash, expiration);
    contractSingle.replaceAsmVars(asmVarsSingle); 
    contractAll = new EnforceAgentBitcoinTransfer(agentKeyHash, approveOutputsHash, refundOutputsHash, expireKeyHash, expiration);
    contractAll.replaceAsmVars(asmVarsAll); 
    console.log("contract script (" + (contractSingle.lockingScript.toHex().length / 2) + ") : " + contractSingle.lockingScript.toHex());
  });

  it('Call approve', () => {
    const tx = createTx(approveOutputScript, outputAmount);

    tx.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromHex(refundOutputScript),
      satoshis: 3000,
    }));

    fixLowS(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);

    const preimage = getPreimage(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
    const sig = signTx(tx, agentKey, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex);

    contractSingle.txContext = { tx, inputIndex, inputSatoshis };

    const res = contractSingle.approve(new Sig(toHex(sig)), new PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.true;
  });

  it('Call approve wrong key', () => {
    const tx = createTx(approveOutputScript, outputAmount);
    fixLowS(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);

    const preimage = getPreimage(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
    const sig = signTx(tx, wrongKey, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex);

    contractSingle.txContext = { tx, inputIndex, inputSatoshis };

    const res = contractSingle.approve(new Sig(toHex(sig)), new PubKey(toHex(wrongKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call approve wrong sig', () => {
    const tx = createTx(approveOutputScript, outputAmount);
    fixLowS(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);

    const preimage = getPreimage(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
    const sig = signTx(tx, wrongKey, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex);

    contractSingle.txContext = { tx, inputIndex, inputSatoshis };

    const res = contractSingle.approve(new Sig(toHex(sig)), new PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call approve with wrong output', () => {
    const tx = createTx(wrongLockScript, outputAmount);
    fixLowS(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);

    const preimage = getPreimage(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
    const sig = signTx(tx, agentKey, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex);

    contractSingle.txContext = { tx, inputIndex, inputSatoshis };

    const res = contractSingle.approve(new Sig(toHex(sig)), new PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call refund', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    fixLowS(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);

    const preimage = getPreimage(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
    const sig = signTx(tx, agentKey, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex);

    contractSingle.txContext = { tx, inputIndex, inputSatoshis };

    const res = contractSingle.refund(new Sig(toHex(sig)), new PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.true;
  });

  it('Call refund with wrong key', () => {
    const tx = createTx(wrongLockScript, outputAmount);
    fixLowS(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
  
    const preimage = getPreimage(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
    const sig = signTx(tx, wrongKey, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex);
  
    contractSingle.txContext = { tx, inputIndex, inputSatoshis };
  
    const res = contractSingle.refund(new Sig(toHex(sig)), new PubKey(toHex(wrongKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call refund with wrong sig', () => {
    const tx = createTx(wrongLockScript, outputAmount);
    fixLowS(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
  
    const preimage = getPreimage(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
    const sig = signTx(tx, wrongKey, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex);
  
    contractSingle.txContext = { tx, inputIndex, inputSatoshis };
  
    const res = contractSingle.refund(new Sig(toHex(sig)), new PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call refund with wrong output', () => {
    const tx = createTx(wrongLockScript, outputAmount);
    fixLowS(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
  
    const preimage = getPreimage(tx, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex, 0x43);
    const sig = signTx(tx, agentKey, contractSingle.lockingScript.toASM(), inputSatoshis, inputIndex);
  
    contractSingle.txContext = { tx, inputIndex, inputSatoshis };
  
    const res = contractSingle.refund(new Sig(toHex(sig)), new PubKey(toHex(agentKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call expire', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    tx.nLockTime = expiration;
    fixLowS(tx, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);
    const sig = signTx(tx, expireKey, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);

    contractAll.txContext = { tx, inputIndex, inputSatoshis };

    const res = contractAll.expire(new Sig(toHex(sig)), new PubKey(toHex(expireKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.true;
  });

  it('Call expire earlier lock time', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    tx.nLockTime = expiration-1;
    fixLowS(tx, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);
    const sig = signTx(tx, expireKey, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);

    contractAll.txContext = { tx, inputIndex, inputSatoshis };

    const res = contractAll.expire(new Sig(toHex(sig)), new PubKey(toHex(expireKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call expire with max sequence', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    tx.nLockTime = expiration;
    tx.inputs[0].sequenceNumber = 0xffffffff;
    let maxSequenceContract;

    for (i=0;i<25;i++) {
        // Modify agent key to get tx to work with low s.
        const maxSequenceAgentKey = new bsv.PrivateKey.fromRandom('testnet');
        const maxSequenceAgentKeyHash = new Ripemd160(toHex(bsv.crypto.Hash.sha256ripemd160(maxSequenceAgentKey.publicKey.toBuffer())));
        maxSequenceContract = new EnforceAgentBitcoinTransfer(maxSequenceAgentKeyHash, approveOutputsHash, refundOutputsHash, expireKeyHash, expiration);
        maxSequenceContract.replaceAsmVars(asmVarsAll); 
        console.log("max sequence contract script (" + (maxSequenceContract.lockingScript.toHex().length / 2) + ") : " + maxSequenceContract.lockingScript.toHex());

        if (checkLowS(tx, maxSequenceContract.lockingScript.toASM(), inputSatoshis, inputIndex)) {
            break;
        }
    }

    const preimage = getPreimage(tx, maxSequenceContract.lockingScript.toASM(), inputSatoshis, inputIndex);
    const sig = signTx(tx, expireKey, maxSequenceContract.lockingScript.toASM(), inputSatoshis, inputIndex);

    maxSequenceContract.txContext = { tx, inputIndex, inputSatoshis };

    const res = maxSequenceContract.expire(new Sig(toHex(sig)), new PubKey(toHex(expireKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call expire with wrong key', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    tx.nLockTime = expiration;
    fixLowS(tx, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);
    const sig = signTx(tx, wrongKey, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);

    contractAll.txContext = { tx, inputIndex, inputSatoshis };

    const res = contractAll.expire(new Sig(toHex(sig)), new PubKey(toHex(wrongKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

  it('Call expire with wrong signature', () => {
    const tx = createTx(refundOutputScript, outputAmount);
    tx.nLockTime = expiration;
    fixLowS(tx, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);

    const preimage = getPreimage(tx, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);
    const sig = signTx(tx, wrongKey, contractAll.lockingScript.toASM(), inputSatoshis, inputIndex);

    contractAll.txContext = { tx, inputIndex, inputSatoshis };

    const res = contractAll.expire(new Sig(toHex(sig)), new PubKey(toHex(expireKey.publicKey)), preimage);
    result = res.verify();
    expect(result.success, result.error).to.be.false;
  });

});

function createTx(script, amount) {
    const result = new bsv.Transaction();

    result.addInput(new bsv.Transaction.Input({
      prevTxId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
      outputIndex: 0,
      script: '',
      sequenceNumber: 1, // Required for lock time
    }), '', inputSatoshis);

    result.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromHex(script),
      satoshis: amount,
    }));

    return result;
}
