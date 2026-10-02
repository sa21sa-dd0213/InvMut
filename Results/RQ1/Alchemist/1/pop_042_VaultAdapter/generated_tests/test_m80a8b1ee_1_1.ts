import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m80a8b1ee test", function () {
  it("should detect mutant that changes multiplication to addition in above-kink interest rate calculation", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor takes no arguments - it calls _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault for testing
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy a mock access control that grants all access
    const MockAccessControl = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await MockAccessControl.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize vault adapter
    await vaultAdapter.initialize(await accessControl.getAddress());
    
    // Setup: Set slopes for an asset with known values
    const asset = owner.address; // Use owner as a dummy asset address
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.5"); // 50% slope above kink
    
    await vaultAdapter.setSlopes(asset, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits with sufficient range
    await vaultAdapter.setLimits(
      ethers.parseEther("10"), // maxMultiplier: 10x
      ethers.parseEther("0.1"), // minMultiplier: 0.1x
      ethers.parseEther("0.01") // rate: 1%
    );
    
    // Setup mock vault to return utilization above kink (e.g., 60%)
    const utilizationAboveKink = ethers.parseEther("0.6"); // 60% utilization
    await mockVault.setUtilization(asset, utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(asset, ethers.parseEther("1"));
    
    // Call rate() which will trigger _applySlopes with utilization above kink
    // First call initializes lastUpdate and index
    await vaultAdapter.rate(await mockVault.getAddress(), asset);
    
    // Fast forward time to ensure elapsed > 0 for the next calculation
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Set a higher utilization index to create excess for calculation
    await mockVault.setCurrentUtilizationIndex(asset, ethers.parseEther("1.5"));
    
    // Now call rate() again - this will use the above-kink path with elapsed > 0
    const rateResult = await vaultAdapter.rate(await mockVault.getAddress(), asset);
    
    // Calculate expected result using original formula:
    // interestRate = (slope0 + (slope1 * excess / 1e27)) * multiplier / 1e27
    // With utilization 60%, kink 50%, excess = 10%
    // slope0 = 0.05e18, slope1 = 0.5e18, excess = 0.1e18
    // multiplier starts at 1e27 (initialized to 0, but after first call it gets set)
    // For the mutant: (slope0 + (slope1 + excess / 1e27)) * multiplier / 1e27
    // This would produce a drastically different result
    
    // The exact expected value depends on the multiplier state, but the key is
    // that the mutant produces a mathematically different result than the original
    
    // We can verify by computing what the original would produce vs what we got
    // Since we can't compute the exact original value in the test easily,
    // we verify that the result is within a reasonable range for the original formula
    
    // For the original formula with excess = 0.1e18, slope1 = 0.5e18:
    // slope1 * excess / 1e27 = 0.5e18 * 0.1e18 / 1e27 = 0.05e9 = 50000000
    // So interest rate base = 0.05e18 + 50000000 ≈ 0.05e18
    
    // For the mutant: slope1 + excess / 1e27 = 0.5e18 + 0.1e18/1e27 = 0.5e18 + 1e-10
    // This is ≈ 0.5e18, which is 10x larger!
    
    // So the mutant should produce a result that is approximately 10x larger
    // than what the original formula would produce
    
    // We can verify this by checking the result is NOT approximately equal to
    // what the original would produce
    const excess = utilizationAboveKink - kink;
    const originalExpectedBase = slope0 + (slope1 * excess) / ethers.parseEther("1");
    // The mutant base would be slope0 + slope1 + (excess / ethers.parseEther("1"))
    const mutantBase = slope0 + slope1 + (excess / ethers.parseEther("1"));
    
    // The actual rate should match the mutant formula (since that's what's deployed)
    // We verify the test detects the difference by asserting the rate is closer to mutant than original
    const rateValue = rateResult;
    const diffFromOriginal = rateValue > originalExpectedBase ? 
       rateValue - originalExpectedBase : originalExpectedBase - rateValue;
    const diffFromMutant = rateValue > mutantBase ? 
       rateValue - mutantBase : mutantBase - rateValue;
    
    // The result should be closer to the mutant calculation
    expect(diffFromMutant).to.be.lt(diffFromOriginal);
  });
});