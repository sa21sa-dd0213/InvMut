import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m06245531 detection", function () {
  it("should detect the arithmetic mutation in _applySlopes when utilization is below kink and product is less than 1e27", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Setup: initialize the adapter and set slopes with a kink value
    const accessControlAddr = await setupAccessControl(owner, instance);
    await instance.initialize(accessControlAddr);
    
    // Set slopes with a reasonable kink (e.g., 0.5e27 = 50% utilization kink)
    const kink = ethers.parseEther("0.5"); // 0.5e18, but we need 1e27 precision
    const slope0 = ethers.parseEther("0.1"); // 0.1 * 1e18
    const slope1 = ethers.parseEther("0.2"); // 0.2 * 1e18
    await instance.connect(owner).setSlopes(await mockVault.getAddress(), { kink: kink * 1n * 10n**9n, slope0: slope0 * 1n * 10n**9n, slope1: slope1 * 1n * 10n**9n });
    
    // Set limits with small multiplier to ensure product is less than 1e27
    await instance.connect(owner).setLimits(
      ethers.parseEther("1"),    // maxMultiplier = 1e18
      ethers.parseEther("0.01"), // minMultiplier = 0.01e18
      ethers.parseEther("0.1")   // rate = 0.1e18
    );
    
    // Set up vault mock to return low utilization (below kink)
    // We need utilization < kink to trigger the else branch
    const lowUtilization = ethers.parseEther("0.1"); // 10% utilization
    await mockVault.setUtilization(lowUtilization);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1")); // index = 1e18
    
    // Call rate() which triggers _applySlopes with utilization below kink
    // The product (slope0 * utilization / kink) * multiplier will be small
    // Expected: (0.1e27 * 0.1e27 / 0.5e27) * 1e18 / 1e27 = (0.02e27) * 1e18 / 1e27 = 0.02e18
    // This is much less than 1e27, so original returns ~0.02e18, mutant would revert or return negative
    
    // In the mutant, it would compute: product - 1e27, which underflows since product < 1e27
    await expect(
      instance.rate(await mockVault.getAddress(), await mockVault.getAddress())
    ).to.not.be.reverted;
    
    // Verify the returned value is reasonable (positive and small)
    const result = await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());
    expect(result).to.be.gt(0);
    expect(result).to.be.lt(ethers.parseEther("1")); // Should be small positive number
  });
});

// Helper to deploy access control
async function setupAccessControl(owner: any, vaultAdapter: any): Promise<string> {
  const AccessControlFactory = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControlFactory.deploy();
  await accessControl.waitForDeployment();
  
  // Grant access to owner for all functions on vaultAdapter
  await accessControl.initialize(owner.address);
  await accessControl.connect(owner).grantAccess("0x00000000", await vaultAdapter.getAddress(), owner.address);
  
  return await accessControl.getAddress();
}

// Mock vault contract for testing
const MockVaultArtifact = {
  abi: [
    "function currentUtilizationIndex(address) external view returns (uint256)",
    "function utilization(address) external view returns (uint256)",
    "function setUtilization(uint256) external",
    "function setCurrentUtilizationIndex(uint256) external"
  ],
  bytecode: "0x608060405234801561001057600080fd5b5061016f806100206000396000f3fe60806040526004361061003f5760003560e01c806324855c7914610044578063a3b5b2f614610077578063d3c7c2c7146100a4575b600080fd5b34801561005057600080fd5b5061006461005f3660046100f0565b5060005490565b60405190815260200160405180910390f35b34801561008357600080fd5b506100976100923660046100f0565b5060015490565b60405190815260200160405180910390f35b3480156100b057600080fd5b506100c46100bf36600461011c565b600055565b005b3480156100d257600080fd5b506100c46100e136600461011c565b600155565b60006020828403121561010257600080fd5b5035919050565b80356001600160a01b038116811461010257600080fd5b60006020828403121561012e57600080fd5b5035919050565b60006020828403121561014757600080fd5b6101518284610109565b939250505056fea2646970667358221220abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789064736f6c63430008120033"
};