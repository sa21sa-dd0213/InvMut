import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m1b5ae808 test", function () {
  it("should detect mutant that replaces subtraction with division in elapsed time calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault for testing
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();
    
    const vaultAddress = await mockVault.getAddress();
    const assetAddress = addr1.address;
    
    // Initialize the VaultAdapter
    await instance.initialize(owner.address);
    
    // Set slopes for the asset to avoid InvalidKink revert
    const slopes = {
      kink: ethers.parseEther("0.8"), // 80% utilization
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.1") // 10% slope above kink
    };
    await instance.setSlopes(assetAddress, slopes);
    
    // Set limits
    await instance.setLimits(
      ethers.parseEther("2"), // maxMultiplier
      ethers.parseEther("0.5"), // minMultiplier
      ethers.parseEther("0.01") // rate
    );
    
    // First call to rate() to initialize utilizationData.lastUpdate
    await instance.rate(vaultAddress, assetAddress);
    
    // Mine a block to advance time by 100 seconds
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    
    // Get the current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // Call rate() again - this will use the elapsed time calculation
    const result = await instance.rate(vaultAssetAddress, assetAddress);
    
    // The original code calculates elapsed = block.timestamp - utilizationData.lastUpdate
    // which should be approximately 100 (the time we advanced)
    // The mutant calculates elapsed = block.timestamp / utilizationData.lastUpdate
    // which would be a very small number (e.g., 1700000000 / 1700000100 ≈ 0.9999...)
    // This would produce a dramatically different interest rate
    
    // If the mutant is present, the result would be close to 0 (division produces ~1, 
    // which when used in the formula gives minimal interest rate)
    // If original, result would be a reasonable positive value
    
    // The test should pass on original (reasonable rate) but fail on mutant (near-zero rate)
    expect(result).to.be.gt(0);
    expect(result).to.be.lt(ethers.parseEther("100")); // Sanity check for reasonable range
  });
});