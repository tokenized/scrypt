const { expect } = require('chai');
const { bsv, signTx, getPreimage, toHex, Bytes, PubKey, Sig, Sha256, Ripemd160 } = require('scryptlib');
const { buildContract, fixLowS, checkLowS, getOutputsHex } = require('./helper.js');

const inputIndex = 0;
const inputSatoshis = 100000;
const key = new bsv.PrivateKey.fromRandom('testnet');
const agentKey = new bsv.PrivateKey.fromRandom('testnet');
const agentAddress = new bsv.Address.fromPublicKey(agentKey.publicKey);
const agentScript = new bsv.Script.fromAddress(agentAddress);
const tokenScript = new bsv.Script.fromHex("ae01234567890fd");
let secondOutput;

describe('Test EnforceOffer', () => {
    let contract, result;
  
    before(() => {
      keyHash = new Ripemd160(toHex(bsv.crypto.Hash.sha256ripemd160(key.publicKey.toBuffer())));

      secondOutput = new bsv.Transaction.Output({
        script: tokenScript,
        satoshis: 1000,
      })
      secondOutputHash = new Sha256(toHex(bsv.crypto.Hash.sha256sha256(secondOutput.toBufferWriter().toBuffer())));

      EnforceOffer = buildContract('enforce_offer.scrypt');
      contract = new EnforceOffer(keyHash, secondOutputHash);
      console.log("contract script (" + (contract.lockingScript.toHex().length / 2) + ") : " + contract.lockingScript.toHex());
    });
  
    it('Call approve', () => {
      const tx = createTx(agentScript, secondOutput, 2000);
      fixLowS(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      const preimage = getPreimage(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);

      // Sign with SIGHASH_SINGLE | SIGHASH_ANYONECANPAY to only sign first input and output so the
      // signature is not invalid after adding more inputs and outputs.
      const sig = signTx(tx, key, contract.lockingScript.toASM(), inputSatoshis, inputIndex, 
        bsv.crypto.Signature.FORKID | bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_ANYONECANPAY);
  
      contract.txContext = { tx, inputIndex, inputSatoshis };

      const outputBytesHex = getOutputsHex(tx)
      const res = contract.unlock(new Sig(toHex(sig)), new PubKey(toHex(key.publicKey)), new Bytes(outputBytesHex), preimage);
      result = res.verify();
      expect(result.success, result.error).to.be.true;
    });
  
    it('Call approve with extra output', () => {
      const tx = createTx(agentScript, secondOutput, 2000);
      fixLowS(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      // Sign with SIGHASH_SINGLE | SIGHASH_ANYONECANPAY to only sign first input and output so the
      // signature is not invalid after adding more inputs and outputs.
      const sig = signTx(tx, key, contract.lockingScript.toASM(), inputSatoshis, inputIndex, 
        bsv.crypto.Signature.FORKID | bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_ANYONECANPAY);

      // Adding outputs should be valid after signing
      tx.addOutput(new bsv.Transaction.Output({
        script: "12345678",
        satoshis: 2500,
      }));

      // Tweak last output's satoshi value until low s is good.
      for (i=0;i<10;i++) {
        if (checkLowS(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex)) {
          break;
        }

        tx.outputs[2].satoshis++;
      }

      const preimage = getPreimage(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      contract.txContext = { tx, inputIndex, inputSatoshis };

      const outputBytesHex = getOutputsHex(tx)
      const res = contract.unlock(new Sig(toHex(sig)), new PubKey(toHex(key.publicKey)), new Bytes(outputBytesHex), preimage);
      result = res.verify();
      expect(result.success, result.error).to.be.true;
    });
  
    it('Call approve with extra input', () => {
      const tx = createTx(agentScript, secondOutput, 2000);
      fixLowS(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      // Sign with SIGHASH_SINGLE | SIGHASH_ANYONECANPAY to only sign first input and output so the
      // signature is not invalid after adding more inputs and outputs.
      const sig = signTx(tx, key, contract.lockingScript.toASM(), inputSatoshis, inputIndex, 
        bsv.crypto.Signature.FORKID | bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_ANYONECANPAY);

      // Adding inputs should be valid after signing
      tx.addInput(new bsv.Transaction.Input({
        prevTxId: 'a477af6b2667c29670467e4e0728b685ee07b240235771862318e29ddbe58458',
        outputIndex: 2,
        script: '',
        sequenceNumber: 1, // Required for lock time
      }), '', 5000);

      // Tweak last input's sequence until low s is good.
      for (i=0;i<10;i++) {
        if (checkLowS(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex)) {
          break;
        }

        tx.inputs[2].sequenceNumber++;
      }

      const preimage = getPreimage(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      contract.txContext = { tx, inputIndex, inputSatoshis };

      const outputBytesHex = getOutputsHex(tx)
      const res = contract.unlock(new Sig(toHex(sig)), new PubKey(toHex(key.publicKey)), new Bytes(outputBytesHex), preimage);
      result = res.verify();
      expect(result.success, result.error).to.be.true;
    });
  
    it('Call approve with modified first output', () => {
      const tx = createTx(agentScript, secondOutput, 2000);
      fixLowS(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      const preimage = getPreimage(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);

      // Sign with SIGHASH_SINGLE | SIGHASH_ANYONECANPAY to only sign first input and output so the
      // signature is not invalid after adding more inputs and outputs.
      const sig = signTx(tx, key, contract.lockingScript.toASM(), inputSatoshis, inputIndex, 
        bsv.crypto.Signature.FORKID | bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_ANYONECANPAY);

      // Modify value of first output should invalidate the signature.
      tx.outputs[0].satoshis = 500;
  
      contract.txContext = { tx, inputIndex, inputSatoshis };

      const outputBytesHex = getOutputsHex(tx)
      const res = contract.unlock(new Sig(toHex(sig)), new PubKey(toHex(key.publicKey)), new Bytes(outputBytesHex), preimage);
      result = res.verify();
      expect(result.success, result.error).to.be.false;
    });
  
    it('Call approve with wrong key', () => {
      const tx = createTx(agentScript, secondOutput, 2000);
      fixLowS(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      const preimage = getPreimage(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);

      // Sign with SIGHASH_SINGLE | SIGHASH_ANYONECANPAY to only sign first input and output so the
      // signature is not invalid after adding more inputs and outputs.
      const sig = signTx(tx, agentKey, contract.lockingScript.toASM(), inputSatoshis, inputIndex, 
        bsv.crypto.Signature.FORKID | bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_ANYONECANPAY);
  
      contract.txContext = { tx, inputIndex, inputSatoshis };

      const outputBytesHex = getOutputsHex(tx)
      const res = contract.unlock(new Sig(toHex(sig)), new PubKey(toHex(agentKey.publicKey)), new Bytes(outputBytesHex), preimage);
      result = res.verify();
      expect(result.success, result.error).to.be.false;
    });
  
    it('Call approve with wrong sig', () => {
      const tx = createTx(agentScript, secondOutput, 2000);
      fixLowS(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      const preimage = getPreimage(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);

      // Sign with SIGHASH_SINGLE | SIGHASH_ANYONECANPAY to only sign first input and output so the
      // signature is not invalid after adding more inputs and outputs.
      const sig = signTx(tx, agentKey, contract.lockingScript.toASM(), inputSatoshis, inputIndex, 
        bsv.crypto.Signature.FORKID | bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_ANYONECANPAY);
  
      contract.txContext = { tx, inputIndex, inputSatoshis };

      const outputBytesHex = getOutputsHex(tx)
      const res = contract.unlock(new Sig(toHex(sig)), new PubKey(toHex(key.publicKey)), new Bytes(outputBytesHex), preimage);
      result = res.verify();
      expect(result.success, result.error).to.be.false;
    });
  
    it('Call approve with wrong output', () => {
      wrongOutput = new bsv.Transaction.Output({
        script: new bsv.Script.fromHex("ae01234567890fdab"),
        satoshis: 1000,
      })

      const tx = createTx(agentScript, wrongOutput, 2000);
      fixLowS(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);
  
      const preimage = getPreimage(tx, contract.lockingScript.toASM(), inputSatoshis, inputIndex);

      // Sign with SIGHASH_SINGLE | SIGHASH_ANYONECANPAY to only sign first input and output so the
      // signature is not invalid after adding more inputs and outputs.
      const sig = signTx(tx, key, contract.lockingScript.toASM(), inputSatoshis, inputIndex, 
        bsv.crypto.Signature.FORKID | bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_ANYONECANPAY);
  
      contract.txContext = { tx, inputIndex, inputSatoshis };

      const outputBytesHex = getOutputsHex(tx)
      const res = contract.unlock(new Sig(toHex(sig)), new PubKey(toHex(key.publicKey)), new Bytes(outputBytesHex), preimage);
      result = res.verify();
      expect(result.success, result.error).to.be.false;
    });

});

function createTx(script1, output2, amount) {
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
  
    result.addOutput(output2);

    return result;
}