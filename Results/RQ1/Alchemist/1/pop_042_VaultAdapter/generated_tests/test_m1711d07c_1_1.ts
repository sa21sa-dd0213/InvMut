import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m1711d07c - block.prevrandao instead of block.timestamp", function () {
  it("should detect the mutant by comparing rate calculation with actual elapsed time", async function () {
    const [owner, vault, asset] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments needed - uses _disableInitializers)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const adapter = await VaultAdapterFactory.deploy();
    await adapter.waitForDeployment();
    
    // Deploy a minimal mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize the adapter
    await adapter.initialize(owner.address);
    
    // Set up slopes for the asset
    const slopes = {
      kink: ethers.parseEther("0.8"), // 80% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base slope
      slope1: ethers.parseEther("1.0") // 100% slope after kink
    };
    await adapter.setSlopes(asset.address, slopes);
    
    // Set limits
    await adapter.setLimits(
      ethers.parseEther("5"),   // maxMultiplier
      ethers.parseEther("0.5"), // minMultiplier
      ethers.parseEther("0.1")  // rate
    );
    
    // Set initial utilization data by calling rate() once
    await adapter.rate(mockVault.target, asset.address);
    
    // Record the first rate
    const firstRate = await adapter.rate(mockVault.target, asset.address);
    
    // Advance time by 100 seconds
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    
    // Call rate again after time advancement
    const secondRate = await adapter.rate(mockVault.target, asset.address);
    
    // In the original contract, the rate should change because elapsed time > 0
    // In the mutant using block.prevrandao, the elapsed time calculation is unpredictable
    // and will not reflect the actual 100-second time advancement
    
    // The test should fail on the mutant because:
    // With original: elapsed = block.timestamp - lastUpdate (will be ~100)
    // With mutant: elapsed = block.prevrandao - lastUpdate (random, not related to time)
    
    // If the rates are identical, the mutant likely didn't update properly
    // If they differ, we need to verify the change is proportional to time
    expect(secondRate).to.not.equal(firstRate);
    
    // Additional check: the multiplier should have changed due to elapsed time
    // We can verify this by checking that the rate changed in a way consistent with
    // the actual elapsed time, not random prevrandao value
    
    // For the original: with 100 seconds elapsed, utilization below kink (mock returns 0),
    // the multiplier should decrease: multiplier * 1e27 / (1e27 + (kink * rate * elapsed / kink))
    // For the mutant: the change would be based on prevrandao value
    
    // The key assertion: if we call rate again without advancing time,
    // the rate should remain stable (no elapsed time)
    const thirdRate = await adapter.rate(mockVault.target, asset.address);
    
    // Without time advancement, elapsed should be 0, so rate should not change
    // But with prevrandao, elapsed could be any value, causing unexpected changes
    expect(thirdRate).to.equal(secondRate);
  });
});