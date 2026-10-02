import { ethers } from "hardhat";
import { expect } from "chai";
import { XBORNID } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("XBORNID", function () {
  let xbornid: XBORNID;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const XBORNIDFactory = await ethers.getContractFactory("XBORNID");
    xbornid = await XBORNIDFactory.deploy();
    await xbornid.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the correct name and symbol", async function () {
      expect(await xbornid.name()).to.equal("XBORN ID");
      expect(await xbornid.symbol()).to.equal("XBornID");
    });

    it("should set the correct total supply", async function () {
      const totalSupply = ethers.parseEther("500000000");
      expect(await xbornid.totalSupply()).to.equal(totalSupply);
    });

    it("should assign initial balance to owner", async function () {
      const ownerBalance = await xbornid.balanceOf(owner.address);
      expect(ownerBalance).to.equal(ethers.parseEther("200000000"));
    });
  });

  describe("Token distribution", function () {
    it("should allow whitelisted users to get tokens", async function () {
      await xbornid.connect(user1).getTokens({ value: 0 });
      
      const userBalance = await xbornid.balanceOf(user1.address);
      expect(userBalance).to.equal(ethers.parseEther("1000"));
    });

    it("should blacklist users after getting tokens", async function () {
      await xbornid.connect(user1).getTokens({ value: 0 });
      
      expect(await xbornid.blacklist(user1.address)).to.be.true;
    });

    it("should not allow blacklisted users to get tokens again", async function () {
      await xbornid.connect(user1).getTokens({ value: 0 });
      
      await expect(
        xbornid.connect(user1).getTokens({ value: 0 })
      ).to.be.reverted;
    });
  });

  describe("Token transfers", function () {
    beforeEach(async function () {
      await xbornid.connect(user1).getTokens({ value: 0 });
    });

    it("should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("100");
      await xbornid.connect(user1).transfer(user2.address, amount);
      
      expect(await xbornid.balanceOf(user2.address)).to.equal(amount);
      expect(await xbornid.balanceOf(user1.address)).to.equal(ethers.parseEther("900"));
    });

    it("should fail to transfer more than balance", async function () {
      const amount = ethers.parseEther("2000");
      
      await expect(
        xbornid.connect(user1).transfer(user2.address, amount)
      ).to.be.reverted;
    });
  });

  describe("Ownership", function () {
    it("should transfer ownership", async function () {
      await xbornid.transferOwnership(user1.address);
      
      // Only new owner can call owner-only functions
      await expect(
        xbornid.connect(owner).finishDistribution()
      ).to.be.reverted;
    });

    it("should allow new owner to finish distribution", async function () {
      await xbornid.transferOwnership(user1.address);
      
      await xbornid.connect(user1).finishDistribution();
      expect(await xbornid.distributionFinished()).to.be.true;
    });
  });

  describe("Withdraw", function () {
    it("should allow owner to withdraw ETH", async function () {
      // Send some ETH to contract
      await owner.sendTransaction({
        to: await xbornid.getAddress(),
        value: ethers.parseEther("1")
      });
      
      const initialBalance = await ethers.provider.getBalance(owner.address);
      await xbornid.withdraw();
      const finalBalance = await ethers.provider.getBalance(owner.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });
});