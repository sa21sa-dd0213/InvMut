import { expect } from "chai";
import { ethers } } from "hardhat";

describe("VaultAdapter - Kill mutant maf023819 (_applySlopes * -> +)", function () {
  it("should kill the mutant by testing the else branch with non-zero _elapsed and _rate", async function () {
    const [owner, vault, asset] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault contract to test with
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy a mock access control
    const MockAccessControl = await ethers.getContractFactory("MockAccessControl");
    const mockAccessControl = await MockAccessControl.deploy();
    await mockAccessControl.waitForDeployment();
    
    // Initialize VaultAdapter
    await instance.initialize(await mockAccessControl.getAddress());
    
    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    const zeroSelector = "0x00000000";
    
    await mockAccessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    await mockAccessControl.grantAccess(setLimitsSelector, await instance.getAddress(), owner.address);
    await mockAccessControl.grantAccess(zeroSelector, await instance.getAddress(), owner.address);
    
    // Set slopes: kink at 50% (0.5e27), slope0 = 0.1e27, slope1 = 0.2e27
    const kink = ethers.parseEther("0.5"); // 0.5e27
    const slope0 = ethers.parseEther("0.1");
    const slope1 = ethers.parseEther("0.2");
    
    await instance.setSlopes(asset.address, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits: maxMultiplier = 2e27, minMultiplier = 0.5e27, rate = 0.1e27
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.1");
    
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Simulate state: set utilization below kink (e.g., 0.3e27)
    const utilizationBelowKink = ethers.parseEther("0.3");
    
    // First call rate() to initialize utilizationData state
    // This will set utilizationData.index and utilizationData.lastUpdate to current time
    await instance.rate(await vault.getAddress(), asset.address);
    
    // Fast forward time by 100 seconds to have _elapsed > 0
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    
    // Now call rate() again - this will trigger the else branch with _elapsed > 0
    // The mutant changes the denominator calculation, so the result should differ
    
    // Calculate expected result for original code manually:
    // multiplier = multiplier * 1e27 / (1e27 + (1e27 * (kink - utilization) / kink) * elapsed * rate / 1e27)
    // Initial multiplier should be 1e27 (default)
    // (kink - utilization) = 0.5e27 - 0.3e27 = 0.2e27
    // 1e27 * 0.2e27 / 0.5e27 = 0.4e27
    // 0.4e27 * 100 * 0.1e27 / 1e27 = 0.4e27 * 100 * 0.1 = 4e27
    // 1e27 + 4e27 = 5e27
    // multiplier = 1e27 * 1e27 / 5e27 = 0.2e27
    // Since 0.2e27 < minMultiplier (0.5e27), multiplier becomes 0.5e27
    // interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // = (0.1e27 * 0.3e27 / 0.5e27) * 0.5e27 / 1e27
    // = 0.06e27 * 0.5e27 / 1e27 = 0.03e27
    
    // For mutant: denominator becomes (1e27 + 0.4e27 * 100 + 0.1e27 / 1e27)
    // = 1e27 + 40e27 + 0.1e27 = 41.1e27
    // multiplier = 1e27 * 1e27 / 41.1e27 ≈ 0.0243e27
    // Since 0.0243e27 < minMultiplier, multiplier becomes 0.5e27
    // But the intermediate calculation differs, which could affect the result
    
    // To reliably kill the mutant, we need a scenario where the multiplier stays above minMultiplier
    // Let's use a smaller elapsed time and a specific rate
    
    // Reset by deploying fresh instance
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();
    await instance2.initialize(await mockAccessControl.getAddress());
    
    // Grant access again
    await mockAccessControl.grantAccess(setSlopesSelector, await instance2.getAddress(), owner.address);
    await mockAccessControl.grantAccess(setLimitsSelector, await instance2.getAddress(), owner.address);
    await mockAccessControl.grantAccess(zeroSelector, await instance2.getAddress(), owner.address);
    
    // Set slopes with lower kink
    const kink2 = ethers.parseEther("0.8");
    await instance2.setSlopes(asset.address, {
      kink: kink2,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits with higher minMultiplier to avoid clamping
    const minMultiplier2 = ethers.parseEther("0.1");
    const rate2 = ethers.parseEther("0.05");
    await instance2.setLimits(maxMultiplier, minMultiplier2, rate2);
    
    // First call to initialize
    await instance2.rate(await vault.getAddress(), asset.address);
    
    // Fast forward 10 seconds
    await ethers.provider.send("evm_increaseTime", [10]);
    await ethers.provider.send("evm_mine", []);
    
    // Call rate() again and get the result
    const result = await instance2.rate(await vault.getAddress(), asset.address);
    
    // The expected result for the original code (calculated manually):
    // utilization = 0.3e27 (below kink)
    // elapsed = 10
    // Initial multiplier = 1e27
    // denominator = 1e27 + (1e27 * (0.8e27 - 0.3e27) / 0.8e27) * 10 * 0.05e27 / 1e27
    // = 1e27 + (0.625e27) * 10 * 0.05
    // = 1e27 + 0.3125e27 = 1.3125e27
    // multiplier = 1e27 * 1e27 / 1.3125e27 = 0.7619e27
    // Since 0.7619e27 > minMultiplier, no clamping
    // interestRate = (0.1e27 * 0.3e27 / 0.8e27) * 0.7619e27 / 1e27
    // = 0.0375e27 * 0.7619e27 / 1e27 = 0.02857e27
    
    // For mutant:
    // denominator = 1e27 + 0.625e27 * 10 + 0.05e27 / 1e27
    // = 1e27 + 6.25e27 + 0.00000000000000000000000000005e27
    // = 7.25e27
    // multiplier = 1e27 * 1e27 / 7.25e27 = 0.1379e27
    // interestRate = 0.0375e27 * 0.1379e27 / 1e27 = 0.00517e27
    
    // The results are significantly different, so we can assert the expected value
    // For the original, result should be approximately 0.02857e27 = 28571428571428571428571428
    // For the mutant, result should be approximately 0.00517e27 = 5172413793103448275862068
    
    // Since we know the original contract returns ~0.02857e27, we assert that
    expect(result).to.be.closeTo(
      ethers.parseEther("0.02857"),
      ethers.parseEther("0.001")
    );
  });
});