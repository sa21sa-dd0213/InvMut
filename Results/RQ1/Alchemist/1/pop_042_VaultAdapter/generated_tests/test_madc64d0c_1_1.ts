import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant kill test - exponentiation vs multiplication", function () {
  it("should detect mutant by verifying interest rate stays within expected range when utilization exceeds kink", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments since it uses _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault contract that implements IVault interface
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy a mock access control contract
    const MockAccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await MockAccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize VaultAdapter with access control
    await instance.initialize(await accessControl.getAddress());
    
    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    const rateSelector = instance.interface.getFunction("rate").selector;
    const zeroSelector = "0x00000000";
    
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(rateSelector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(zeroSelector, await instance.getAddress(), owner.address);
    
    // Setup slopes with a kink at 50% (0.5e27)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.1"); // 10% base rate
    const slope1 = ethers.parseEther("0.8"); // 80% slope above kink
    await instance.setSlopes(await mockVault.getAddress(), { kink, slope0, slope1 });
    
    // Set limits to allow multiplier to grow
    const maxMultiplier = ethers.parseEther("10");
    const minMultiplier = ethers.parseEther("0.1");
    const rate = ethers.parseEther("0.1");
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Setup mock vault to return utilization above kink (80% utilization)
    const utilizationAboveKink = ethers.parseEther("0.8");
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("100"));
    
    // First call to rate() to initialize the utilization data
    await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());
    
    // Advance time by 1 second to have elapsed time > 0
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine");
    
    // Set new utilization index to create a delta
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("100"));
    
    // Call rate() again - this will trigger the _applySlopes with excess > 0
    const result = await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());
    
    // The interest rate should be a reasonable number (not astronomically large)
    // In the original: interestRate = (slope0 + (slope1 * excess / 1e27)) * multiplier / 1e27
    // With excess = 0.3e27, slope0 = 0.1e27, slope1 = 0.8e27
    // Expected max: ~(0.1e27 + 0.24e27) * 10 / 1e27 = 3.4e27 (reasonable)
    // With mutant exponentiation: 1e27 ** excess would overflow or produce absurd values
    expect(result).to.be.lessThan(ethers.parseEther("100")); // Should be well under 100% (1e27 = 100%)
    
    // Also verify the rate is positive and makes economic sense
    expect(result).to.be.greaterThan(0);
  });
});