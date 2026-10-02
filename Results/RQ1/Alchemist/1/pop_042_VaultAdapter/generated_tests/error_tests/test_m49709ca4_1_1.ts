import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m49709ca4 - rate function else branch removal", function () {
  it("should kill mutant by calling rate twice in same block to expose missing utilization fetch", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments needed since constructor only calls _disableInitializers)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple mock vault that returns utilization
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    // Deploy MockAccessControl
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Initialize the VaultAdapter
    await instance.initialize(await accessControl.getAddress());
    
    // Set slopes for an asset
    const asset = owner.address; // Use a dummy asset address
    await instance.setSlopes(asset, {
      kink: ethers.parseEther("0.8"), // 80% utilization kink
      slope0: ethers.parseEther("0.05"),
      slope1: ethers.parseEther("0.1")
    });
    
    // Set limits
    await instance.setLimits(
      ethers.parseEther("2"),    // maxMultiplier
      ethers.parseEther("0.5"),  // minMultiplier
      ethers.parseEther("0.1")   // rate
    );
    
    // First call to rate - sets lastUpdate to current block timestamp
    await instance.rate(await mockVault.getAddress(), asset);
    
    // Second call in same block - this should trigger the else branch
    // Original would fetch utilization from vault; mutant uses default 0
    const result = await instance.rate(await mockVault.getAddress(), asset);
    
    // If mutant is alive, utilization will be 0 and interest rate will be 0
    // If original, utilization from vault will be used and result will be non-zero
    expect(result).to.be.gt(0);
  });
});