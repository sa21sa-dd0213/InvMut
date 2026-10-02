import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m433e931f test", function () {
  it("should kill mutant that replaces + with - in _QUOTE_TARGET_ calculation during buyShares", async function () {
    const [owner, user1] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();
    
    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const gsp = await Factory.deploy();
    await gsp.waitForDeployment();
    
    // Set up initial state using storage manipulation
    const baseTokenAddress = await baseToken.getAddress();
    const quoteTokenAddress = await quoteToken.getAddress();
    
    // Storage slots based on contract layout
    const _MAINTAINER_ = 2;
    const _BASE_TOKEN_ = 3;
    const _QUOTE_TOKEN_ = 4;
    const _BASE_RESERVE_ = 5;
    const _QUOTE_RESERVE_ = 6;
    const _I_ = 30; // Slot after _K_ which is at 29
    
    // Set base token
    await ethers.provider.send("hardhat_setStorageAt", [
      await gsp.getAddress(),
      "0x" + _BASE_TOKEN_.toString(16).padStart(64, "0"),
      ethers.zeroPadValue(baseTokenAddress, 32)
    ]);
    
    // Set quote token
    await ethers.provider.send("hardhat_setStorageAt", [
      await gsp.getAddress(),
      "0x" + _QUOTE_TOKEN_.toString(16).padStart(64, "0"),
      ethers.zeroPadValue(quoteTokenAddress, 32)
    ]);
    
    // Set maintainer
    await ethers.provider.send("hardhat_setStorageAt", [
      await gsp.getAddress(),
      "0x" + _MAINTAINER_.toString(16).padStart(64, "0"),
      ethers.zeroPadValue(owner.address, 32)
    ]);
    
    // Set I value (i = 1)
    const I_VALUE = ethers.parseEther("1");
    await ethers.provider.send("hardhat_setStorageAt", [
      await gsp.getAddress(),
      "0x" + _I_.toString(16).padStart(64, "0"),
      ethers.zeroPadValue(ethers.toBeHex(I_VALUE), 32)
    ]);
    
    // Fund the contract with initial tokens
    const INITIAL_BASE = ethers.parseEther("1000");
    const INITIAL_QUOTE = ethers.parseEther("1000");
    
    await baseToken.transfer(await gsp.getAddress(), INITIAL_BASE);
    await quoteToken.transfer(await gsp.getAddress(), INITIAL_QUOTE);
    
    // First buyShares call to initialize the pool
    await baseToken.connect(user1).approve(await gsp.getAddress(), ethers.parseEther("10"));
    await quoteToken.connect(user1).approve(await gsp.getAddress(), ethers.parseEther("10"));
    
    await baseToken.transfer(user1.address, ethers.parseEther("10"));
    await quoteToken.transfer(user1.address, ethers.parseEther("10"));
    
    // Call buyShares - this will set initial _BASE_TARGET_ and _QUOTE_TARGET_
    const tx1 = await gsp.connect(user1).buyShares(user1.address);
    await tx1.wait();
    
    // Get the state after first buy
    const stateAfterFirstBuy = await gsp.getPMMState();
    const quoteTargetAfterFirstBuy = stateAfterFirstBuy.Q0;
    
    // User1 buys more shares - this should increase _QUOTE_TARGET_
    await baseToken.transfer(user1.address, ethers.parseEther("5"));
    await quoteToken.transfer(user1.address, ethers.parseEther("5"));
    
    await baseToken.connect(user1).approve(await gsp.getAddress(), ethers.parseEther("5"));
    await quoteToken.connect(user1).approve(await gsp.getAddress(), ethers.parseEther("5"));
    
    const tx2 = await gsp.connect(user1).buyShares(user1.address);
    await tx2.wait();
    
    // Get state after second buy
    const stateAfterSecondBuy = await gsp.getPMMState();
    const quoteTargetAfterSecondBuy = stateAfterSecondBuy.Q0;
    
    // The mutant replaces + with -, so _QUOTE_TARGET_ would decrease instead of increase
    // In the original, _QUOTE_TARGET_ should increase
    expect(quoteTargetAfterSecondBuy).to.be.gt(quoteTargetAfterFirstBuy);
  });
});