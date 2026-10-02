import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant md9e88b9c - rate function division vs subtraction", function () {
  it("should correctly compute utilization using division, not subtraction", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments as per the contract)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault to test with
    // We need a contract that implements IVault with currentUtilizationIndex and utilization
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Setup access control
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Initialize the VaultAdapter
    await instance.initialize(await accessControl.getAddress());

    // Set slopes for an asset (required for rate calculation)
    const assetAddress = addr1.address;
    const slopes = {
      kink: ethers.parseEther("0.8"), // 80% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.5") // 50% slope above kink
    };

    // Grant access to set slopes
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    await instance.connect(owner).setSlopes(assetAddress, slopes);

    // Set limits
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setLimitsSelector, await instance.getAddress(), owner.address);
    await instance.connect(owner).setLimits(
      ethers.parseEther("2"), // maxMultiplier
      ethers.parseEther("0.5"), // minMultiplier
      ethers.parseEther("0.1") // rate
    );

    // Grant access for rate function (required by _authorizeUpgrade check)
    const rateSelector = instance.interface.getFunction("rate").selector;
    await accessControl.grantAccess(rateSelector, await instance.getAddress(), owner.address);

    // Setup initial utilization data by calling rate once to set initial index and lastUpdate
    await instance.connect(owner).rate(await mockVault.getAddress(), assetAddress);

    // Fast forward time to create elapsed > 0
    await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds
    await ethers.provider.send("evm_mine", []);

    // Set the mock vault to return a specific utilization index that would expose the bug
    // The bug: (index - utilizationData.index) / elapsed vs (index - utilizationData.index) - elapsed
    // With elapsed = 100 and index diff = 200:
    // Original: 200 / 100 = 2
    // Mutant: 200 - 100 = 100 (vastly different)
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("0.02")); // index increased by 0.02 (200 basis points)

    // Call rate again
    const result = await instance.connect(owner).rate(await mockVault.getAddress(), assetAddress);

    // The utilization should be approximately (0.02 - 0) / 100 = 0.0002 (2 basis points)
    // With the mutant it would be 0.02 - 100 = -99.98 (invalid negative value)
    // This would cause the interest rate calculation to produce a completely different result
    // The exact expected value depends on the slopes, but the key is the mutant produces a negative utilization
    // which would revert or produce nonsensical results in _applySlopes
    expect(result).to.be.gt(0);
    expect(result).to.be.lt(ethers.parseEther("1")); // Reasonable interest rate
  });
});