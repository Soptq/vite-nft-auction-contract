import { describe } from "mocha";
import { expect } from "chai";
const vite = require('@vite/vuilder');
import config from "./vite.config.json";

let provider: any;
let deployer: any;
let alice: any;
let bob: any;
let charlie: any;
let nftContract: any;
let contract: any;

const name = 'Non Fungible Token';
const symbol = 'NFT';
const firstTokenId = '5042';
const secondTokenId = '79217';

describe('Test NFTMarketplace', function () {
  before(async function () {
    provider = vite.newProvider("http://127.0.0.1:23456");
    // init users
    deployer = vite.newAccount(config.networks.local.mnemonic, 0, provider);
    alice = vite.newAccount(config.networks.local.mnemonic, 1, provider);
    bob = vite.newAccount(config.networks.local.mnemonic, 2, provider);
    charlie = vite.newAccount(config.networks.local.mnemonic, 3, provider);
    await deployer.sendToken(alice.address, '500');
    await alice.receiveAll();
    await deployer.sendToken(bob.address, '500');
    await bob.receiveAll();
    await deployer.sendToken(charlie.address, '500');
    await charlie.receiveAll();
    // compile
    const compiledNFTContract = await vite.compile('NFT.solpp');
    expect(compiledNFTContract).to.have.property('NFT');
    nftContract = compiledNFTContract.NFT;
    const compiledContract = await vite.compile('NFTMarketplace.solpp');
    expect(compiledContract).to.have.property('NFTMarketplace');
    contract = compiledContract.NFTMarketplace;
    // deploy
    nftContract.setDeployer(deployer).setProvider(provider);
    await nftContract.deploy({params: [name, symbol], responseLatency: 1});
    expect(nftContract.address).to.be.a('string');
    contract.setDeployer(deployer).setProvider(provider);
    await contract.deploy({params: [], responseLatency: 1});
    expect(contract.address).to.be.a('string');
    // mint
    await nftContract.call('mint', [deployer.address, firstTokenId], {});
    await nftContract.call('mint', [deployer.address, secondTokenId], {});
  });

  describe('NFT balanceOf', function () {
    context('when the given address does not own any tokens', function () {
      it('returns the amount of tokens owned by the given address', async function () {
        expect(await nftContract.query('balanceOf', [deployer.address])).to.be.deep.equal(['2']);
      });
    });

    context('when the given address does not own any tokens', function () {
      it('returns 0', async function () {
        expect(await nftContract.query('balanceOf', [alice.address])).to.be.deep.equal(['0']);
      });
    });
  });

  describe('NFT transfers', function () {
    it('owner transfers the ownership of firstToken to the given address', async function () {
      await nftContract.call('transferFrom', [deployer.address, alice.address, firstTokenId], {caller: deployer});
      await nftContract.call('transferFrom', [deployer.address, alice.address, secondTokenId], {caller: deployer});
      expect(await nftContract.query('balanceOf', [alice.address])).to.be.deep.equal(['2']);
    });
  });

  describe('NFT Auction', function () {
    before(async function () {
      await nftContract.call('approve', [contract.address, firstTokenId], {caller: alice});
      await nftContract.call('approve', [contract.address, secondTokenId], {caller: alice});
    });

    it('initialize a english auction', async function () {
      let startDate = Math.round((new Date()).getTime() / 1000);
      await contract.call('initializeAuction', [
          0,
          nftContract.address,
          firstTokenId,
          startDate, 
          startDate + 300,
          startDate + 300,
          100,
          100,
          0
        ], {caller: alice});
      let count = await contract.query('getAuctionCount', []);
      expect(count).to.be.deep.equal(['1']);  
      let auctionInfo = await contract.query('getAuctionInfo', [0]);  
      expect(auctionInfo).to.be.deep.equal(['0', alice.address, '0']);
      let auctionTarget = await contract.query('getAuctionTarget', [0]);
      expect(auctionTarget).to.be.deep.equal([nftContract.address, firstTokenId]);
      let auctionDate = await contract.query('getAuctionDate', [0]);
      expect(auctionDate).to.be.deep.equal([startDate.toString(), (startDate + 300).toString(), (startDate + 300).toString()]);
      let auctionPrice = await contract.query('getAuctionPrice', [0]);
      expect(auctionPrice).to.be.deep.equal(['100', '100', '0']);
    });

    it('bid the english auction', async function () {
      await contract.call('bid', [0], {caller: bob, amount: "110"});

      expect(await bob.balance()).to.be.equal('390');

      await contract.call('bid', [0], {caller: charlie, amount: "120"});

      await bob.receiveAll();
      expect(await bob.balance()).to.be.equal('500');
      expect(await charlie.balance()).to.be.equal('380');
    });

    it('cancel the auction', async function () {
      await contract.call('cancelAuction', [0], {caller: alice});

      await alice.receiveAll();
      await charlie.receiveAll()
      let auctionInfo = await contract.query('getAuctionInfo', [0]);  
      expect(auctionInfo).to.be.deep.equal(['0', alice.address, '1']);
      await nftContract.waitForHeight(9);
      expect(await nftContract.query('balanceOf', [alice.address])).to.be.deep.equal(['2']);
      expect(await charlie.balance()).to.be.equal('500');
    });

    it('initialize a dutch auction', async function () {
      let startDate = Math.round((new Date()).getTime() / 1000);
      await contract.call('initializeAuction', [
          1,
          nftContract.address,
          secondTokenId,
          startDate, 
          startDate,
          startDate + 300,
          300,
          100,
          0
        ], {caller: alice});
      let count = await contract.query('getAuctionCount', []);
      expect(count).to.be.deep.equal(['2']);  
      let auctionInfo = await contract.query('getAuctionInfo', [1]);  
      expect(auctionInfo).to.be.deep.equal(['1', alice.address, '0']);
      let auctionTarget = await contract.query('getAuctionTarget', [1]);
      expect(auctionTarget).to.be.deep.equal([nftContract.address, secondTokenId]);
      let auctionDate = await contract.query('getAuctionDate', [1]);
      expect(auctionDate).to.be.deep.equal([startDate.toString(), startDate.toString(), (startDate + 300).toString()]);
      let auctionPrice = await contract.query('getAuctionPrice', [1]);
      expect(auctionPrice).to.be.deep.equal(['300', '100', '0']);
    });

    it('bid the dutch auction', async function () {
      await contract.call('bid', [1], {caller: bob, amount: "300"});

      await bob.receiveAll();
      expect(parseInt(await bob.balance())).to.be.greaterThanOrEqual(200);

      await alice.receiveAll();
      expect(parseInt(await alice.balance())).to.be.lessThanOrEqual(800);
      await bob.receiveAll();
      expect(await nftContract.query('balanceOf', [bob.address])).to.be.deep.equal(['1']);
    });

    it('final price should greater of equal than the reserved price', async function () {
      let startDate = Math.round((new Date()).getTime() / 1000);
      await nftContract.call('approve', [contract.address, firstTokenId], {caller: alice});
      await contract.call('initializeAuction', [
          1,
          nftContract.address,
          firstTokenId,
          startDate, 
          startDate,
          startDate + 300,
          300,
          100,
          300
        ], {caller: alice});
      await nftContract.waitForHeight(13);
      expect(await nftContract.query('balanceOf', [alice.address])).to.be.deep.equal(['0']);
      await contract.call('bid', [2], {caller: charlie, amount: "300"});
      
      await alice.receiveAll();
      await charlie.receiveAll();
      expect(await charlie.balance()).to.be.equal('500');
      expect(await nftContract.query('balanceOf', [alice.address])).to.be.deep.equal(['1']);
    });

    it('reading auctions', async function () {
      let count = await contract.query('getAuctionCount', []);
        expect(count).to.be.deep.equal(['3']);  
        let auctionInfos = await contract.query('getAuctionInfos', [0, 10]);  
        expect(auctionInfos).to.be.deep.equal([['0', '1', '1'], [alice.address, alice.address, alice.address], ['1', '1', '1']]);
        let auctionTargets = await contract.query('getAuctionTargets', [0, 10]);
        expect(auctionTargets).to.be.deep.equal([[nftContract.address, nftContract.address, nftContract.address], [firstTokenId, secondTokenId, firstTokenId]]);
    });
  });
});