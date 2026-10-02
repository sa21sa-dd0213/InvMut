import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant mb2d0fbc2 test", function () {
  it("should kill mutant by detecting incorrect baseBalance calculation when MT_FEE_BASE is accumulated", async function () {
    const [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens for BASE and QUOTE
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Deploy GSPFunding contract
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the pool with base and quote tokens
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("2000");
    const initialI = ethers.parseEther("2"); // price ratio
    
    await baseToken.transfer(await instance.getAddress(), baseAmount);
    await quoteToken.transfer(await instance.getAddress(), quoteAmount);
    
    // Initialize pool (assuming there's an init function or direct state setting)
    // For this test, we'll call buyShares to initialize
    await instance.connect(user1).buyShares(user1.address);
    
    // Accumulate MT_FEE_BASE by performing some trades or direct deposit
    // Simulate fee accumulation by transferring base tokens directly to contract
    const feeAmount = ethers.parseEther("100");
    await baseToken.transfer(await instance.getAddress(), feeAmount);
    
    // Now MT_FEE_BASE should be set (assuming there's a way to accumulate it)
    // For testing purposes, we'll set it directly via the maintainer
    await instance.connect(owner).adjustMtFeeRate(ethers.parseEther("0.1")); // 10% fee
    
    // Get initial state before sellShares
    const totalSupplyBefore = await instance.totalSupply();
    const userShares = await instance.balanceOf(user1.address);
    
    // Calculate expected baseAmount correctly (original behavior)
    const baseBalanceBefore = await baseToken.balanceOf(await instance.getAddress());
    const mtFeeBase = await instance._MT_FEE_BASE_();
    const actualBaseBalance = baseBalanceBefore - mtFeeBase;
    const expectedBaseAmount = actualBaseBalance * userShares / totalSupplyBefore;
    
    // Perform sellShares - mutant will use baseBalance + mtFeeBase instead of -
    const tx = instance.connect(user1).sellShares(
      userShares,
      user1.address,
      0, // baseMinAmount
      0, // quoteMinAmount
      "0x", // data
      Math.floor(Date.now() / 1000) + 3600 // deadline
    );
    
    // The mutant should revert because it calculates baseAmount higher than actual balance
    await expect(tx).to.be.reverted;
  });
});