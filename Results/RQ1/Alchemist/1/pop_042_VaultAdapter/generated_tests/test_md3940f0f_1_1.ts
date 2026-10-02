import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant test - md3940f0f", function () {
  it("should kill mutant by detecting incorrect excess calculation when utilization > kink", async function () {
    const [owner, vault, asset] = await ethers.getSigners();
    
    // Deploy VaultAdapter
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const adapter = await VaultAdapterFactory.deploy();
    await adapter.waitForDeployment();
    
    // Deploy a mock vault contract for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Setup: initialize the adapter
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    await adapter.initialize(await accessControl.getAddress());
    
    // Setup slopes for the asset
    const kink = ethers.parseEther("0.5"); // 50% kink
    const slope0 = ethers.parseEther("0.1"); // 10% slope0
    const slope1 = ethers.parseEther("0.2"); // 20% slope1
    
    // Grant access to owner for setSlopes
    const setSlopesSelector = adapter.interface.getFunction("setSlopes").selector;
    await accessControl.grantAccess(setSlopesSelector, await adapter.getAddress(), owner.address);
    
    await adapter.connect(owner).setSlopes(await asset.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Setup limits
    const maxMultiplier = ethers.parseEther("2"); // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.1"); // 10% rate
    
    const setLimitsSelector = adapter.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setLimitsSelector, await adapter.getAddress(), owner.address);
    
    await adapter.connect(owner).setLimits(maxMultiplier, minMultiplier, rate);
    
    // Setup mock vault to return specific utilization values
    const utilization = ethers.parseEther("0.8"); // 80% utilization (above kink)
    const utilizationIndex = ethers.parseEther("1000");
    
    await mockVault.setUtilization(await asset.getAddress(), utilization);
    await mockVault.setCurrentUtilizationIndex(await asset.getAddress(), utilizationIndex);
    
    // Grant access for rate function (checkAccess with bytes4(0) for internal _authorizeUpgrade)
    const zeroSelector = "0x00000000";
    await accessControl.grantAccess(zeroSelector, await adapter.getAddress(), owner.address);
    
    // Call rate function
    const result = await adapter.connect(owner).rate(await mockVault.getAddress(), await asset.getAddress());
    
    // Verify the result is unreasonably high (mutant behavior)
    const maxPossibleRate = ethers.parseEther("0.6");
    expect(result).to.be.gt(maxPossibleRate);
    
    // Also verify the result is not zero
    expect(result).to.not.equal(0);
  });
});