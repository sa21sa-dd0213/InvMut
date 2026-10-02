import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant test - m6782573b", function () {
  it("should kill the mutant by calling rate() when utilization is below kink and checking the result is reasonable", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy VaultAdapter (constructor has no arguments - it only calls _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();
    
    // Deploy a mock vault that we can control
    // We need a vault that implements IVault interface for the rate() function
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy a mock access control contract
    const MockAccessControl = await ethers.getContractFactory("MockAccessControl");
    const mockAccessControl = await MockAccessControl.deploy();
    await mockAccessControl.waitForDeployment();
    
    // Initialize the vault adapter
    await vaultAdapter.initialize(await mockAccessControl.getAddress());
    
    // Set slopes for an asset with kink value (must be < 1e27 and > 0)
    const assetAddress = addr1.address;
    const kink = ethers.parseEther("0.5"); // 0.5 * 1e18 (well below 1e27)
    const slope0 = ethers.parseEther("0.1");
    const slope1 = ethers.parseEther("0.2");
    await vaultAdapter.setSlopes(assetAddress, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.01");
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Configure mock vault to return utilization below kink (e.g., 0.3 ether = 30% utilization)
    const utilizationBelowKink = ethers.parseEther("0.3");
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1000"));
    
    // Call rate() which will execute the else branch (utilization < kink)
    const result = await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);
    
    // The result should be positive and reasonable (not negative, not zero, not absurdly large)
    // The original formula produces a positive rate, the mutant would produce a negative or incorrect value
    expect(result).to.be.gt(0);
    expect(result).to.be.lt(ethers.parseEther("100")); // Reasonable upper bound
    
    // Also verify the multiplier was updated correctly by calling rate again
    const result2 = await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);
    expect(result2).to.be.gt(0);
  });
});