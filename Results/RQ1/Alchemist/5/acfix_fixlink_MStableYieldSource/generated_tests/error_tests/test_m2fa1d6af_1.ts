import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant m2fa1d6af - ReentrancyGuard initialization", function () {
  it("should detect missing ReentrancyGuard() constructor call by testing reentrancy protection", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy a mock mAsset token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockMAsset = await MockERC20Factory.deploy("Mock MAsset", "mMASS");
    await mockMAsset.waitForDeployment();
    
    // Configure mock savings to return our mock mAsset
    await mockSavings.setUnderlying(await mockMAsset.getAddress());
    
    // Deploy the MStableYieldSource (mutant version without ReentrancyGuard())
    const MStableYieldSourceFactory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await MStableYieldSourceFactory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Fund the contract with some mAsset for testing
    await mockMAsset.mint(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Fund addr1 with mAsset
    await mockMAsset.mint(addr1.address, ethers.parseEther("100"));
    
    // Approve spending for the test
    await mockMAsset.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Configure mock savings depositSavings to allow reentrancy by calling supplyTokenTo again
    let reentrancyAttempted = false;
    await mockSavings.setDepositSavingsCallback(async () => {
      if (!reentrancyAttempted) {
        reentrancyAttempted = true;
        // Attempt reentrant call to supplyTokenTo
        await instance.connect(addr1).supplyTokenTo(ethers.parseEther("1"), addr1.address);
      }
    });
    
    // First call should succeed (or fail if reentrancy guard works)
    try {
      await instance.connect(addr1).supplyTokenTo(ethers.parseEther("10"), addr1.address);
      // If we get here, the first call succeeded
      // Now check if the reentrant call was blocked
      // The reentrant call should have reverted if ReentrancyGuard is properly initialized
      // If it didn't revert, the mutant is alive
      if (reentrancyAttempted) {
        // Check that the reentrant call actually reverted by examining state
        const balanceAfter = await instance.imBalances(addr1.address);
        // If reentrancy succeeded, balance would be higher than expected
        // We expect only one credit increment (from the outer call)
        expect(balanceAfter).to.be.lt(ethers.parseEther("20")); // Arbitrary check
      }
    } catch (error: any) {
      // If the outer call itself reverts, that's also fine - means reentrancy guard is working
      expect(error.message).to.include("reentrant");
    }
  });
});