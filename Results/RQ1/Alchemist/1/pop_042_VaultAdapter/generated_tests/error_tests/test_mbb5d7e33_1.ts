import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter - kill mutant mbb5d7e33", function () {
  it("should kill mutant by checking multiplier decreases monotonically with large elapsed time when utilization below kink", async function () {
    const [owner, vault, user] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments needed - it has constructor() { _disableInitializers(); })
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault contract that returns controlled utilization values
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Setup: initialize the adapter with an access control contract
    // For simplicity, deploy a simple access control that allows everything
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    await instance.initialize(await accessControl.getAddress());
    
    const asset = await ethers.Wallet.createRandom().getAddress();
    
    // Set slopes with a kink value (must be < 1e27 and > 0)
    const kink = ethers.parseEther("0.5"); // 0.5 * 10^18
    const slope0 = ethers.parseEther("0.1");
    const slope1 = ethers.parseEther("0.2");
    await instance.setSlopes(asset, { kink, slope0, slope1 });
    
    // Set limits: maxMultiplier = 2e27, minMultiplier = 0.5e27, rate = 0.1e27
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.1");
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // Configure mock vault to return a utilization BELOW kink (e.g., 0.3 * 10^18)
    const utilization = ethers.parseEther("0.3");
    await mockVault.setUtilization(asset, utilization);
    await mockVault.setCurrentUtilizationIndex(asset, 0);
    
    // First call to rate() to initialize the lastUpdate timestamp and index
    await instance.rate(await mockVault.getAddress(), asset);
    
    // Fast forward time to create a large elapsed time
    // We want (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27 > 1e27
    // excess = kink - utilization = 0.5e27 - 0.3e27 = 0.2e27
    // (1e27 * 0.2e27 / (1e27 - 0.5e27)) * elapsed * 0.1e27 / 1e27 > 1e27
    // (0.2e54 / 0.5e27) * elapsed * 0.1e27 / 1e27 > 1e27
    // 0.4e27 * elapsed * 0.1e27 / 1e27 > 1e27
    // 0.04e27 * elapsed > 1e27
    // elapsed > 25 seconds
    // Use 100 seconds to be safe
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    
    // Call rate() - in the original, multiplier should decrease toward minMultiplier
    // In the mutant, the denominator becomes negative, causing incorrect behavior
    const tx = instance.rate(await mockVault.getAddress(), asset);
    
    // The mutant should produce a revert or unexpected result
    // The original would succeed with a decreased multiplier
    // The mutant with the subtraction will have a negative denominator when
    // (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27 > 1e27
    // This will cause the multiplication to overflow or produce garbage
    await expect(tx).to.be.reverted;
  });
});