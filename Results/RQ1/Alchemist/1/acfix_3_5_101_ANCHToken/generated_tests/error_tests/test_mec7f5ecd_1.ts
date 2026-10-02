import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken - kill mutant mec7f5ecd (missing return in approve)", function () {
  it("should return true when calling approve from owner and verify the return value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with constructor arguments
    // Note: Constructor requires _route (UniswapV2Router02 address) and _USDToken address
    // For testing purposes, we'll use a mock approach since we don't have real Uniswap addresses
    // We'll deploy a minimal test setup
    const Factory = await ethers.getContractFactory("ANCHToken");
    
    // Deploy a mock router and token for constructor
    const MockERC20 = await ethers.getContractFactory("contracts/test/MockERC20.sol:MockERC20");
    const mockUSDToken = await MockERC20.deploy();
    await mockUSDToken.waitForDeployment();
    
    const MockRouter = await ethers.getContractFactory("contracts/test/MockUniswapV2Router02.sol:MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    
    const instance = await Factory.deploy(
      await mockRouter.getAddress(),
      await mockUSDToken.getAddress()
    );
    await instance.waitForDeployment();

    // Test that approve returns true - this should fail on the mutant
    const tx = await instance.approve(addr1.address, ethers.parseEther("100"));
    const receipt = await tx.wait();
    
    // The key assertion: check that the transaction was successful
    expect(receipt.status).to.equal(1);
    
    // Also verify the allowance was set correctly
    const allowance = await instance.allowance(owner.address, addr1.address);
    expect(allowance).to.equal(ethers.parseEther("100"));
    
    // This is the critical test: if approve doesn't return true (mutant),
    // the transaction might still succeed but the return value check below will fail
    // We call approve and capture the return value
    const result = await instance.approve.staticCall(addr1.address, ethers.parseEther("200"));
    expect(result).to.equal(true);
  });
});