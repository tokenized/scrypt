const { expect } = require('chai');
const { bsv, signTx, getPreimage, toHex, Bytes, PubKey, Sig, Sha256, Ripemd160 } = require('scryptlib');
const { buildContract, fixLowS } = require('./helper.js');

const inputIndex = 0;
const inputSatoshis = 100000;
const key = new bsv.PrivateKey.fromRandom('testnet');
const agentKey = new bsv.PrivateKey.fromRandom('testnet');
const agentAddress = new bsv.Address.fromPublicKey(agentKey.publicKey);
const agentScript = new bsv.Script.fromAddress(agentAddress);
const tokenScript = new bsv.Script.fromHex("ae01234567890fd");

describe('Test EnforceOffer', () => {
    let contract, result;
  
    before(() => {
      EnforceOffer = buildContract('enforce_offer.scrypt');
      keyHash = new Ripemd160(toHex(bsv.crypto.Hash.sha256ripemd160(key.publicKey.toBuffer())));
      firstOutputHash = new Sha256(toHex(bsv.crypto.Hash.sha256sha256(agentScript.toBuffer())));
      secondOutputHash = new Sha256(toHex(bsv.crypto.Hash.sha256sha256(tokenScript.toBuffer())));
      contract = new EnforceOffer(agentKeyHash, firstOutputHash, secondOutputHash);
      console.log("contract script (" + (contract.lockingScript.toHex().length / 2) + ") : " + contract.lockingScript.toHex());
    });
  
    it('Call approve', () => {
      const tx = createTx(agentScript, tokenScript);
  
      // This should change the Tx.checkPreimageOpt (OP_PUSH_TX) function to use SIGHASH_ANYONECANPAY | SIGHASH_SINGLE
      contract.replaceAsmVars(asmVars); 
  
      fixLowS(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      const preimage = getPreimage(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
      const sig = signTx(tx, key, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      contract.txContext = { tx, inputIndex, inputSatoshis };
  
      const res = contract.unlock(new Sig(toHex(sig)), new PubKey(toHex(key.publicKey)), preimage, outputBytes);
      result = res.verify();
      expect(result.success, result.error).to.be.true;
    });

});

function createTx(script1, script2, amount) {
    const result = new bsv.Transaction();

    result.addInput(new bsv.Transaction.Input({
      prevTxId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
      outputIndex: 0,
      script: '',
      sequenceNumber: 1, // Required for lock time
    }), '', inputSatoshis);

    result.addOutput(new bsv.Transaction.Output({
      script: script1,
      satoshis: amount,
    }));
  
    result.addOutput(new bsv.Transaction.Output({
      script: script2,
      satoshis: 1000,
    }));

    return result;
}