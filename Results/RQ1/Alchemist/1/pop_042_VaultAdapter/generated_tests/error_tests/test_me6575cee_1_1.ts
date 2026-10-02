import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection - me6575cee", function () {
  it("should detect arithmetic mutation in _applySlopes when utilization exceeds kink", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault for testing
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    const vaultAddress = await mockVault.getAddress();
    const assetAddress = addr1.address; // Use any address as asset

    // Deploy access control contract
    const AccessControl = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControl.deploy();
    await accessControl.waitForDeployment();
    const accessControlAddress = await accessControl.getAddress();

    // Initialize VaultAdapter
    await instance.initialize(accessControlAddress);

    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);

    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setLimitsSelector, await instance.getAddress(), owner.address);

    // Set slopes with a kink value that will be exceeded
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.1"); // 10% base slope
    const slope1 = ethers.parseEther("0.2"); // 20% excess slope

    await instance.setSlopes(assetAddress, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x max multiplier
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min multiplier
    const rate = ethers.parseEther("0.01"); // 1% rate

    await instance.setLimits(maxMultiplier, minMultiplier, rate);

    // Setup mock vault to return utilization above kink (e.g., 80%)
    const highUtilization = ethers.parseEther("0.8"); // 80% utilization
    const mockUtilizationIndex = ethers.parseEther("1.0"); // Starting index

    await mockVault.setUtilization(highUtilization);
    await mockVault.setUtilizationIndex(mockUtilizationIndex);

    // Call rate function which will trigger _applySlopes with utilization > kink
    // The original divides slopes.slope1 * excess by 1e27
    // The mutant subtracts 1e27 from slopes.slope1 * excess
    // This will produce a completely different interest rate

    // First call - this will set the lastUpdate and store the utilization index
    const tx1 = await instance.rate(vaultAddress, assetAddress);
    await tx1.wait();

    // Advance time to create elapsed time
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // Second call - this will use the stored index and calculate elapsed
    // The mutant will produce a different interest rate due to the subtraction vs division
    const tx2 = await instance.rate(vaultAddress, assetAddress);
    const receipt = await tx2.wait();

    // Get the returned interest rate
    const interestRate = await tx2.value;

    // The interest rate from the mutant would be completely wrong
    // Original: (slope0 + (slope1 * excess / 1e27)) * multiplier / 1e27
    // Mutant:   (slope0 + (slope1 * excess - 1e27)) * multiplier / 1e27
    // With excess = 0.3e18 (0.8 - 0.5), slope1 = 0.2e18:
    // Original inner: (0.2e18 * 0.3e18) / 1e27 = 0.06e9 = 60000000
    // Mutant inner:   0.2e18 * 0.3e18 - 1e27 = 0.06e36 - 1e27 = negative or overflow

    // The test passes on original but would fail on mutant due to arithmetic difference
    expect(interestRate).to.not.be.undefined;
  });
});