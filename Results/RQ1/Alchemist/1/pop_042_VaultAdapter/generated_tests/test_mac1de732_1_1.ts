import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter - kill mutant mac1de732", function () {
  it("should enforce minimum multiplier when utilization is below kink", async function () {
    const [owner, vault, asset] = await ethers.getSigners();

    // Deploy VaultAdapter (constructor takes no arguments, uses _disableInitializers)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const adapter = await VaultAdapterFactory.deploy();
    await adapter.waitForDeployment();

    // Deploy a mock vault contract that returns predictable utilization values
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Deploy a mock AccessControl
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Grant access to the deployer for setSlopes and setLimits
    await accessControl.grantAccess(adapter.interface.getFunction("setSlopes").selector, await adapter.getAddress(), owner.address);
    await accessControl.grantAccess(adapter.interface.getFunction("setLimits").selector, await adapter.getAddress(), owner.address);

    // Initialize adapter with access control
    await adapter.initialize(await accessControl.getAddress());

    // Set slopes with a kink value
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink

    await adapter.setSlopes(await asset.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits: minMultiplier to a meaningful value, maxMultiplier high, rate high to accelerate multiplier decay
    const maxMultiplier = ethers.parseEther("2"); // 2x max
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min
    const rate = ethers.parseEther("0.1"); // 10% decay rate per second

    await adapter.setLimits(maxMultiplier, minMultiplier, rate);

    // Configure mock vault to return utilization below kink (e.g., 30%)
    const utilizationBelowKink = ethers.parseEther("0.3"); // 30% utilization
    await mockVault.setUtilization(utilizationBelowKink);

    // First call to rate() initializes the lastUpdate and index
    const currentIndex = ethers.parseEther("1000"); // arbitrary starting index
    await mockVault.setCurrentUtilizationIndex(currentIndex);

    await adapter.rate(await mockVault.getAddress(), await asset.getAddress());

    // Now advance time significantly so multiplier would decay below minMultiplier
    // With rate=0.1 per second, after 100 seconds, multiplier would decrease significantly
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    // Set a higher index to simulate utilization increase over time (but still below kink)
    const newIndex = ethers.parseEther("1030"); // increased by 30 over 100 seconds = 0.3 utilization
    await mockVault.setCurrentUtilizationIndex(newIndex);
    await mockVault.setUtilization(utilizationBelowKink); // keep utilization below kink

    // Call rate() again - this should trigger the multiplier update logic
    const result = await adapter.rate(await mockVault.getAddress(), await asset.getAddress());

    // Calculate expected interest rate with minMultiplier enforcement
    // multiplier should be capped at minMultiplier (0.5e18)
    // interestRate = (slope0 * utilization / kink) * minMultiplier / 1e27
    const expectedRate = (slope0 * utilizationBelowKink / kink) * minMultiplier / ethers.parseEther("1");

    // The result should be >= the rate calculated with minMultiplier
    // If the mutant is live (no minMultiplier enforcement), multiplier would be lower
    // and the resulting rate would be lower than expected
    expect(result).to.be.gte(expectedRate);

    // Additional check: if we call again with more time, multiplier should still be at min
    await ethers.provider.send("evm_increaseTime", [1000]);
    await ethers.provider.send("evm_mine", []);

    const newIndex2 = ethers.parseEther("1060"); // increased by 30 more
    await mockVault.setCurrentUtilizationIndex(newIndex2);

    const result2 = await adapter.rate(await mockVault.getAddress(), await asset.getAddress());
    expect(result2).to.be.gte(expectedRate);
  });
});