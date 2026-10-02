import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m9f957dee - division vs subtraction", function () {
  let vaultAdapter: any;
  let mockVault: any;
  let mockAccessControl: any;
  let owner: any;
  let addr1: any;

  before(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock AccessControl that always returns true for checkAccess
    const MockAccessControl = await ethers.getContractFactory("MockAccessControl");
    mockAccessControl = await MockAccessControl.deploy();
    await mockAccessControl.waitForDeployment();

    // Deploy mock Vault that returns specific utilization values
    const MockVault = await ethers.getContractFactory("MockVault");
    mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    // Deploy VaultAdapter (constructor has no arguments - uses _disableInitializers)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Initialize
    await vaultAdapter.initialize(await mockAccessControl.getAddress());

    // Set slopes with a kink value (must be < 1e27 and > 0)
    await vaultAdapter.setSlopes(await mockVault.getAddress(), {
      kink: ethers.parseEther("0.5"), // 5e26 (50% in 1e27 precision)
      slope0: ethers.parseEther("0.05"), // 5e25
      slope1: ethers.parseEther("0.1"), // 1e26
    });

    // Set limits
    await vaultAdapter.setLimits(
      ethers.parseEther("2"), // maxMultiplier: 2e27
      ethers.parseEther("0.5"), // minMultiplier: 5e26
      ethers.parseEther("0.1") // rate: 1e26
    );
  });

  it("should detect mutant by verifying correct interest rate calculation when utilization exceeds kink", async function () {
    const assetAddress = await mockVault.getAddress();
    const vaultAddress = await mockVault.getAddress();

    // Setup mock to return utilization above kink (80% = 8e26)
    // and a currentUtilizationIndex that will trigger the kink branch
    const utilizationIndex = ethers.parseEther("2"); // 2e27
    const utilization = ethers.parseEther("0.8"); // 8e26 (above kink of 5e26)
    
    await mockVault.setCurrentUtilizationIndex(utilizationIndex);
    await mockVault.setUtilization(utilization);
    
    // First call to initialize the lastUpdate timestamp
    await vaultAdapter.rate(vaultAddress, assetAddress);
    
    // Advance time by 1 second to have elapsed > 0
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // Set a new index that is higher than previous to trigger the kink branch
    const newIndex = utilizationIndex + ethers.parseEther("0.1"); // 2.1e27
    await mockVault.setCurrentUtilizationIndex(newIndex);
    
    // Get the rate - this will trigger the kink branch calculation
    const rate = await vaultAdapter.rate(vaultAddress, assetAddress);
    
    // Calculate expected rate using original formula:
    // excess = utilization - kink = 8e26 - 5e26 = 3e26
    // multiplier = prev_multiplier * (1e27 + (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27) / 1e27
    // With elapsed = 1 second, prev_multiplier = 1e27 (initial), rate = 1e26
    // multiplier = 1e27 * (1e27 + (1e27 * 3e26 / (1e27 - 5e26)) * 1 * 1e26 / 1e27) / 1e27
    // = 1e27 * (1e27 + (3e53 / 5e26) * 1e26 / 1e27) / 1e27
    // = 1e27 * (1e27 + (6e26) * 1e26 / 1e27) / 1e27
    // = 1e27 * (1e27 + 6e25) / 1e27
    // = 1e27 + 6e25 = 1.06e27
    
    // Expected interest rate = (slope0 + (slope1 * excess / 1e27)) * multiplier / 1e27
    // = (5e25 + (1e26 * 3e26 / 1e27)) * 1.06e27 / 1e27
    // = (5e25 + 3e25) * 1.06 = 8e25 * 1.06 = 8.48e25
    
    const expectedRate = ethers.parseEther("0.0848"); // 8.48e25
    
    // The mutant would compute a much lower value because it subtracts 1e27 instead of dividing
    // The mutant multiplier would be: 1e27 * (1e27 + 6e25) - 1e27 = ~1.06e54 - 1e27 = ~1.06e54 (huge)
    // Then interest rate = 8e25 * 1.06e54 / 1e27 = 8.48e52 (huge)
    // So the mutant would produce a rate many orders of magnitude higher
    
    // Verify the rate is close to expected (within reasonable range)
    // The original produces ~8.48e25, the mutant produces ~8.48e52
    // So we check that rate is less than 1e30 (which would indicate mutant behavior)
    expect(rate).to.be.lessThan(ethers.parseEther("1000")); // Well below mutant's huge value
    
    // Also verify it's in the expected range
    const minExpected = ethers.parseEther("0.08");
    const maxExpected = ethers.parseEther("0.09");
    expect(rate).to.be.gte(minExpected);
    expect(rate).to.be.lte(maxExpected);
  });
});

// Deploy mock contracts
contract("MockAccessControl", function () {
  // Simple implementation that always returns true
  this.checkAccess = async function(selector: any, contract: any, caller: any) {
    return true;
  };
});

contract("MockVault", function () {
  this.utilizationValue = ethers.parseEther("0.8");
  this.indexValue = ethers.parseEther("2");
  
  this.setUtilization = async function(value: any) {
    this.utilizationValue = value;
  };
  
  this.setCurrentUtilizationIndex = async function(value: any) {
    this.indexValue = value;
  };
  
  this.currentUtilizationIndex = async function(asset: any) {
    return this.indexValue;
  };
  
  this.utilization = async function(asset: any) {
    return this.utilizationValue;
  };
});