import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - supplyTokenTo empty body", function () {
  it("should detect that supplyTokenTo does not update imBalances when function body is removed", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock savings contract that returns deterministic values
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy mock mAsset token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockMAsset = await MockERC20Factory.deploy();
    await mockMAsset.waitForDeployment();
    
    // Configure mock savings to return our mAsset
    await mockSavings.setUnderlying(mockMAsset.target);
    
    // Deploy MStableYieldSource with mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(mockSavings.target);
    await instance.waitForDeployment();
    
    // Mint tokens to addr1 and approve the yield source
    const supplyAmount = ethers.parseEther("100");
    await mockMAsset.mint(addr1.address, supplyAmount);
    await mockMAsset.connect(addr1).approve(instance.target, supplyAmount);
    
    // Configure mock savings to return a fixed amount of credits
    const creditsIssued = ethers.parseEther("95"); // Some conversion rate
    await mockSavings.setCreditsIssued(creditsIssued);
    
    // Record balance before
    const balanceBefore = await instance.imBalances(addr1.address);
    
    // Call supplyTokenTo - in mutant this should do nothing
    await instance.connect(addr1).supplyTokenTo(supplyAmount, addr1.address);
    
    // Record balance after
    const balanceAfter = await instance.imBalances(addr1.address);
    
    // The mutant removes the body, so balance should be unchanged
    // The original would have increased it by creditsIssued
    expect(balanceAfter).to.equal(balanceBefore);
    
    // Additional check: verify tokens were NOT transferred to the contract
    const contractBalance = await mockMAsset.balanceOf(instance.target);
    expect(contractBalance).to.equal(0);
  });
});