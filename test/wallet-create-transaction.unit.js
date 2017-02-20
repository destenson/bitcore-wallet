'use strict';

var path = require('path');
var should = require('chai').should();
var expect = require('chai').expect;
var BitcoreWalletTransaction = require('../bin/wallet-create-transaction');
var Transaction = require('bitcore-lib').Transaction;
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var fs = require('fs');

describe('BitcoreWalletTransaction', function() {
  var testDirPath = path.resolve(__dirname, './testdata');

  var tx;
  beforeEach(function() {
    tx = new BitcoreWalletTransaction({
      program: {
        args: [
          testDirPath + '/input.json',
          testDirPath + '/tmp/output.hex'
        ],
        maxTxSize: 1E4,
        maxSatoshis: 30 * 1E8
      }
    })
  });

  it('should set utxos from file', function() {
    tx._setInputInformation();
    tx.utxos.length.should.equal(1);
  });

  it('should set addresses and amounts from file', function() {
    tx._setInputInformation();
    tx._addresses.length.should.equal(2);
  });

  it('should create object tx' , function() {
    tx._createTransaction();
    expect(tx.tx).to.be.an.instanceof(Transaction);
  });

  it('should add outputs', function() {
    tx._setInputInformation();
    tx._createTransaction();
    tx._addOutputs();
    tx.tx.outputs.length.should.equal(2);
  });

  it('should add inputs', function() {
    tx._setInputInformation();
    tx._createTransaction();
    tx._addInputs();
    tx.tx.inputs.length.should.equal(1);
  });

  it('should not add more inputs if max tx size has been exceeded', function() {
    tx._setInputInformation();
    tx._createTransaction();
    var utxo = tx.utxos[0];
    tx.maxTxSize = 73;
    tx._hasInputSpace(utxo).should.be.false;
  });

  it('should add more inputs if tx size has not been exceeded', function() {
    tx._setInputInformation();
    tx._createTransaction();
    var utxo = tx.utxos[0];
    tx.maxTxSize = 92;
    tx._hasInputSpace(utxo).should.be.true;
  });

  it('should not add more inputs if max satoshis amount has been exceeded', function() {
    tx._setInputInformation();
    tx._createTransaction();
    var utxo = tx.utxos[0];
    tx.maxSatoshis = 0;
    tx._hasInputAmount(utxo).should.be.false;
  });

  it('should add more inputs if max satoshis has not been exceeded', function() {
    tx._setInputInformation();
    tx._createTransaction();
    var utxo = tx.utxos[0];
    tx._hasInputAmount(utxo).should.be.true;
  });

  it('should not process any utxo that is not pay-to-public-key-hash', function() {
    tx._setInputInformation();
    var utxo = tx.utxos[0];
    utxo.scriptPubKey = 'a914dbf9d6b62d48f06df49d130a7ee9c5155c65d3cf87';
    tx._isP2PKH(utxo).should.be.false;
  });

  it('should process any utxo that is pay-to-public-key-hash', function() {
    tx._setInputInformation();
    var utxo = tx.utxos[0];
    utxo.scriptPubKey = '76a91491e68fcb67227e17a47bec1dacf398b78c5d816488ac';
    tx._isP2PKH(utxo).should.be.true;
  });

  it('should set a fee on the transaction', function() {
    tx._setInputInformation();
    tx._createTransaction();
    tx._addOutputs();
    tx._setFee();
    tx.tx.getFee().should.be.equal(21840);
  });

  it('should check amounts', function() {
    tx._setInputInformation();
    tx._createTransaction();
    tx._addOutputs();
    tx._addInputs();
    tx._setFee();
    expect(tx._checkAmounts.bind(tx)).to.not.throw(Error);
  });

  it('should check amounts and error', function() {
    tx._setInputInformation();
    tx._createTransaction();
    tx._addresses[0].satoshis = tx._addresses[0].satoshis + 1000;
    tx._addOutputs();
    tx._addInputs();
    tx._setFee();
    expect(tx._checkAmounts.bind(tx)).to.throw('Output amounts exceed input amounts.');
  });

  it('should write unchecked serialized tx to a file', function(done) {
    mkdirp(testDirPath + '/tmp', function(err) {
      if(err) {
        return done(err);
      }
      rimraf(tx.outputFile, function(err) {
        if(err) {
          return done(err);
        }
        tx._createTransaction();
        tx._writeOutputFile(function(err) {
          if(err) {
            return done(err);
          }
          fs.readFile(tx.outputFile, function(err, data) {
            if(err) {
              return done(err);
            }
            data.toString('hex').should.equal('3031303030303030303030303030303030303030');
            done();
          });
        });
      });
    });
  });

  it('should generate stats', function() {
    tx._setInputInformation();
    tx._createTransaction();
    tx._addOutputs();
    tx._addInputs();
    tx._setFee();
    tx._generateStats().should.equal('Total BTC sent: 14.00033320\nNumber of output addresses: 2\nTotal fees in satoshis: 33320\nTotal size in bytes: 238\nSatoshis per byte: 140\n');
  });

});
