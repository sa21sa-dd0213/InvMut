import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Kill mutant mf5c3c499", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  
  // Mock addresses for required interfaces
  const mockSGlp = "0x0000000000000000000000000000000000000001";
  const mockUsdc = "0x0000000000000000000000000000000000000002";
  const mockRewardRouter = "0x0000000000000000000000000000000000000003";
  const mockGlpManager = "0x0000000000000000000000000000000000000004";
  const mockJuniorVault = "0x0000000000000000000000000000000000000005";
  const mockKeeper = "0x0000000000000000000000000000000000000006";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(
      mockSGlp,
      mockUsdc,
      mockRewardRouter,
      mockGlpManager,
      mockJuniorVault,
      mockKeeper
    );
  });

  it("should revert when claiming with amount == 0 (original behavior), but mutant would revert on non-zero amount", async function () {
    // First, we need to set up a scenario where a user has unclaimed shares
    // This requires going through the deposit flow to create a valid claim
    
    // Set the keeper for executing batch operations
    await instance.setKeeper(mockKeeper);
    
    // We need to create a deposit scenario to get unclaimed shares
    // Since we're using mock addresses, we'll directly manipulate the vaultBatchingState
    // by calling internal functions through the public interface
    
    // For the test to work, we need to simulate that a user has unclaimed shares
    // This is done by making a deposit and then executing batch operations
    
    // Since the contract uses external contracts (USDC, sGlp, etc.), we need to
    // work with what's available. The key test is the _claim function behavior.
    
    // We can test the revert condition directly by attempting to claim with amount = 0
    // This should revert in the original code due to the `if (amount == 0) revert InvalidInput(0x11);` check
    
    await expect(
      instance.connect(addr1).claim(addr2.address, 0)
    ).to.be.revertedWithCustomError(instance, "InvalidInput");
    
    // Now test that claiming with a non-zero amount should NOT revert due to the zero-check
    // (it may revert for other reasons like insufficient shares, but not for amount == 0 check)
    
    // The mutant would incorrectly revert here because it checks `amount != 0`
    // So if the original allows this call to proceed (even if it reverts for other reasons),
    // the mutant would kill it by reverting with the wrong error
    
    // We expect the call to NOT revert with InvalidInput(0x11) when amount is non-zero
    // (it may revert with InsufficientShares since we haven't deposited)
    await expect(
      instance.connect(addr1).claim(addr2.address, 100)
    ).to.not.be.revertedWithCustomError(instance, "InvalidInput");
  });
});