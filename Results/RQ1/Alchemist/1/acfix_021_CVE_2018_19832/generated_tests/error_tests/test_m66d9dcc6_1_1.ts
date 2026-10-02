import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia", function () {
  let token: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addrs: any[];

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    
    const NewIntelTechMedia = await ethers.getContractFactory("NewIntelTechMedia");
    token = await NewIntelTechMedia.deploy();
    await token.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens", async function () {
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(ethers.utils.parseEther("500000000"));
    });

    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("NewIntelTechMedia");
      expect(await token.symbol()).to.equal("NETM");
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // First distribute some tokens to addr1
      await token.distr(addr1.address, ethers.utils.parseEther("100"));
      
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.utils.parseEther("100"));

      // Transfer tokens from addr1 to addr2
      await token.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("50"));
      
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(ethers.utils.parseEther("50"));
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("");

      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });

  describe("Distribution", function () {
    it("Should allow token distribution", async function () {
      await token.distr(addr1.address, ethers.utils.parseEther("1000"));
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(ethers.utils.parseEther("1000"));
    });

    it("Should finish distribution when supply is reached", async function () {
      // Distribute large amount to finish distribution
      await token.distr(addr1.address, await token.totalRemaining());
      
      expect(await token.distributionFinished()).to.be.true;
    });
  });

  describe("Blacklist", function () {
    it("Should blacklist addresses after distribution", async function () {
      await token.distr(addr1.address, ethers.utils.parseEther("100"));
      
      expect(await token.blacklist(addr1.address)).to.be.true;
    });
  });

  describe("Ownership", function () {
    it("Should transfer ownership", async function () {
      await token.transferOwnership(addr1.address);
      expect(await token.owner()).to.equal(addr1.address);
    });

    it("Should not transfer ownership to zero address", async function () {
      await token.transferOwnership(ethers.constants.AddressZero);
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe("Burn", function () {
    it("Should burn tokens", async function () {
      const initialSupply = await token.totalSupply();
      const burnAmount = ethers.utils.parseEther("1000");
      
      await token.burn(burnAmount);
      
      const newSupply = await token.totalSupply();
      expect(newSupply).to.equal(initialSupply.sub(burnAmount));
    });
  });
});