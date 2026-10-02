import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ANCHToken } from "../typechain-types";

describe("ANCHToken", function () {
  let token: ANCHToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let mockRouter: SignerWithAddress;
  let mockUSDToken: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2, mockRouter, mockUSDToken] = await ethers.getSigners();
    
    const ANCHTokenFactory = await ethers.getContractFactory("ANCHToken");
    token = await ANCHTokenFactory.deploy(mockRouter.address, mockUSDToken.address);
    await token.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("ANCH");
      expect(await token.symbol()).to.equal("ANCH");
    });

    it("Should have correct total supply", async function () {
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(ethers.utils.parseEther("10000000"));
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.utils.parseEther("100");
      
      // Transfer tokens to addr1
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("Unauthorized role");
    });

    it("Should update balances after transfers", async function () {
      const amount = ethers.utils.parseEther("100");
      const initialOwnerBalance = await token.balanceOf(owner.address);
      
      await token.transfer(addr1.address, amount);
      await token.transfer(addr2.address, amount);
      
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      expect(await token.balanceOf(addr2.address)).to.equal(amount);
    });
  });

  describe("Allowances", function () {
    it("Should approve tokens for delegated transfer", async function () {
      const amount = ethers.utils.parseEther("100");
      
      await token.approve(addr1.address, amount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(amount);
    });

    it("Should perform delegated transfer", async function () {
      const amount = ethers.utils.parseEther("100");
      
      await token.approve(addr1.address, amount);
      await token.connect(addr1).transferFrom(owner.address, addr2.address, amount);
      
      expect(await token.balanceOf(addr2.address)).to.equal(amount);
    });

    it("Should fail with insufficient allowance", async function () {
      const amount = ethers.utils.parseEther("100");
      
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, amount)
      ).to.be.revertedWith("Unauthorized role");
    });
  });

  describe("Ownable", function () {
    it("Should change owner", async function () {
      await token.changeOwner(addr1.address);
      expect(await token.owner()).to.equal(addr1.address);
    });

    it("Should fail if non-owner tries to change owner", async function () {
      await expect(
        token.connect(addr1).changeOwner(addr1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Settings", function () {
    it("Should set minimum transaction amount", async function () {
      const newMinTxn = ethers.utils.parseEther("50000");
      await token.setMinTxnAmount(newMinTxn);
      expect(await token.minTxnAmount()).to.equal(newMinTxn);
    });

    it("Should set reward rate", async function () {
      await token.setRewardRate(10);
      expect(await token.rewardRate()).to.equal(10);
    });

    it("Should fail if non-owner tries to set settings", async function () {
      await expect(
        token.connect(addr1).setMinTxnAmount(ethers.utils.parseEther("50000"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});