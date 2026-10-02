import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { DCF, LiquidityHelper } from "../typechain-types";

describe("DCF Token", function () {
  let dcf: DCF;
  let liquidityHelper: LiquidityHelper;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let liquidityReceiveAddress: SignerWithAddress;
  let cfo: SignerWithAddress;

  beforeEach(async function () {
    [owner, addr1, addr2, liquidityReceiveAddress, cfo] = await ethers.getSigners();

    const DCFFactory = await ethers.getContractFactory("DCF");
    dcf = await DCFFactory.deploy(liquidityReceiveAddress.address);
    await dcf.deployed();

    // Set CFO
    await dcf.setCaller(cfo.address);

    // Get LiquidityHelper address
    const helperAddress = await dcf.helperAddress();
    liquidityHelper = await ethers.getContractAt("LiquidityHelper", helperAddress);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await dcf.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await dcf.name()).to.equal("DCF Token");
      expect(await dcf.symbol()).to.equal("DCF");
    });

    it("Should have correct total supply", async function () {
      const totalSupply = await dcf.totalSupply();
      expect(totalSupply).to.equal(ethers.utils.parseEther("2000000"));
    });

    it("Should mint initial supply to owner", async function () {
      const ownerBalance = await dcf.balanceOf(owner.address);
      expect(ownerBalance).to.equal(ethers.utils.parseEther("2000000"));
    });

    it("Should set white addresses correctly", async function () {
      expect(await dcf.whiteAddress(owner.address)).to.be.true;
      expect(await dcf.whiteAddress(dcf.address)).to.be.true;
      expect(await dcf.whiteAddress(liquidityReceiveAddress.address)).to.be.true;
    });
  });

  describe("Blacklist functionality", function () {
    it("Should allow CFO to set blacklist", async function () {
      await dcf.connect(cfo).setBlack(addr1.address, true);
      expect(await dcf.blackAddress(addr1.address)).to.be.true;
    });

    it("Should prevent blacklisted addresses from transferring", async function () {
      // First transfer some tokens to addr1
      await dcf.transfer(addr1.address, ethers.utils.parseEther("1000"));
      
      // Blacklist addr1
      await dcf.connect(cfo).setBlack(addr1.address, true);
      
      // Try to transfer from blacklisted address
      await expect(
        dcf.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("black address not transfer");
    });
  });

  describe("Transfer functionality", function () {
    it("Should allow transfers between non-blacklisted addresses", async function () {
      await dcf.transfer(addr1.address, ethers.utils.parseEther("1000"));
      await dcf.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("500"));
      
      expect(await dcf.balanceOf(addr2.address)).to.equal(ethers.utils.parseEther("500"));
    });

    it("Should prevent buying from pair address", async function () {
      // Get pair address
      const pairAddress = await dcf.pairAddress();
      
      // Try to simulate a buy by transferring from pair address
      await dcf.transfer(pairAddress, ethers.utils.parseEther("100"));
      
      // Now try to transfer from pair to another address (simulating buy)
      await expect(
        dcf.connect(await ethers.getSigner(pairAddress)).transfer(
          addr1.address, 
          ethers.utils.parseEther("50")
        )
      ).to.be.revertedWith("buy error");
    });
  });

  describe("CFO functions", function () {
    it("Should allow CFO to set distribute address", async function () {
      await dcf.connect(cfo).setDistributeAddress(addr1.address);
      expect(await dcf.distributeAddress()).to.equal(addr1.address);
    });

    it("Should allow CFO to distribute tokens", async function () {
      await dcf.connect(cfo).setDistributeAddress(addr1.address);
      
      // Transfer tokens to contract for distribution
      await dcf.transfer(dcf.address, ethers.utils.parseEther("3000"));
      
      await dcf.connect(cfo).distributeToken();
      
      expect(await dcf.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("2000"));
    });

    it("Should allow CFO to set white addresses in bulk", async function () {
      const addresses = [addr1.address, addr2.address];
      await dcf.connect(cfo).setWhiteBulk(addresses, true);
      
      expect(await dcf.whiteAddress(addr1.address)).to.be.true;
      expect(await dcf.whiteAddress(addr2.address)).to.be.true;
    });

    it("Should allow CFO to set black addresses in bulk", async function () {
      const addresses = [addr1.address, addr2.address];
      await dcf.connect(cfo).setBlackBulk(addresses, true);
      
      expect(await dcf.blackAddress(addr1.address)).to.be.true;
      expect(await dcf.blackAddress(addr2.address)).to.be.true;
    });

    it("Should allow CFO to set liquidity receive address", async function () {
      await dcf.connect(cfo).setLiquidityReceiveAddress(addr1.address);
      
      // Verify the white address was set
      expect(await dcf.whiteAddress(addr1.address)).to.be.true;
    });
  });

  describe("Owner functions", function () {
    it("Should allow owner to set CFO", async function () {
      await dcf.setCaller(addr1.address);
      expect(await dcf.cfo()).to.equal(addr1.address);
    });
  });

  describe("Distribution periodic", function () {
    it("Should not allow distribution before init time", async function () {
      await dcf.connect(cfo).setDistributeAddress(addr1.address);
      
      await expect(
        dcf.distributeTokenPeriodic()
      ).to.be.revertedWith("Not within the execution time range");
    });
  });
});