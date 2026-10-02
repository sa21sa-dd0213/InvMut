import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mc5520883 - exponentiation vs multiplication", function () {
  it("should kill the mutant by detecting incorrect interest rate calculation when exponentiation replaces multiplication", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (constructor has no arguments since it only calls _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a minimal access control contract
    const MinimalAccessControl = await ethers.getContractFactory("MinimalAccessControl");
    const accessControl = await MinimalAccessControl.deploy();
    await accessControl.waitForDeployment();

    // Initialize the VaultAdapter
    await instance.initialize(await accessControl.getAddress());

    // Deploy a mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    const vaultAddress = await mockVault.getAddress();

    // Set up slopes for an asset
    const testAsset = addr1.address;
    const slopes = {
      kink: ethers.parseEther("0.5"), // 50% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base slope
      slope1: ethers.parseEther("0.5"), // 50% slope above kink
    };

    await instance.setSlopes(testAsset, slopes);

    // Set limits with a non-zero rate to trigger the mutated calculation
    const maxMultiplier = ethers.parseEther("2"); // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.1"); // 10% rate - this value will be exponentiated in mutant

    await instance.setLimits(maxMultiplier, minMultiplier, rate);

    // Set up the mock vault to return specific utilization values
    const initialUtilization = ethers.parseEther("0.6"); // 60% utilization (above kink)
    await mockVault.setUtilization(initialUtilization);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.0"));

    // Call rate() to initialize the storage with lastUpdate = current timestamp
    await instance.rate(vaultAddress, testAsset);

    // Fast forward time by 100 seconds to create a non-zero _elapsed value
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    // Set a new utilization index to create a delta that will be used in the calculation
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.05"));
    await mockVault.setUtilization(ethers.parseEther("0.65"));

    // Call rate() again - this will trigger the _applySlopes with _elapsed = 100
    const result = await instance.rate(vaultAddress, testAsset);

    // The result should not be zero (a basic sanity check)
    expect(result).to.not.equal(0);

    // Calculate expected result using original multiplication logic
    const expectedExcess = ethers.parseEther("0.15");
    const expectedSlopePart = slopes.slope0 + (slopes.slope1 * expectedExcess / ethers.parseEther("1"));
    const expectedMultiplier = ethers.parseEther("4"); // As calculated in the original logic
    const expectedRate = expectedSlopePart * expectedMultiplier / ethers.parseEther("1");

    // This assertion will fail on the mutant because exponentiation gives different result
    expect(result).to.be.closeTo(expectedRate, ethers.parseEther("0.1"));
  });
});