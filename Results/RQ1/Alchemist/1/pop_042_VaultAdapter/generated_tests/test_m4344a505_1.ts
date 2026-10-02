import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m4344a505 - block.timestamp replaced with block.prevrandao", function () {
  it("should detect mutant by verifying rate updates with elapsed time", async function () {
    const [owner, vault, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments needed as per contract)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(owner.address);
    
    // Set up slopes for an asset
    const asset = addr1.address;
    const slopes = {
      kink: ethers.parseEther("0.5"), // 50% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.1") // 10% slope above kink
    };
    
    await instance.connect(owner).setSlopes(asset, slopes);
    
    // Set limits
    await instance.connect(owner).setLimits(
      ethers.parseEther("2"), // maxMultiplier: 2x
      ethers.parseEther("0.5"), // minMultiplier: 0.5x
      ethers.parseEther("0.1") // rate: 10%
    );
    
    // First call to rate to initialize the utilization data
    // This simulates a vault with 60% utilization (above kink)
    const mockVault = await ethers.getContractFactory("MockVault");
    const vaultInstance = await mockVault.deploy();
    await vaultInstance.waitForDeployment();
    
    // Set initial utilization to 60% (0.6e18)
    await vaultInstance.setUtilization(ethers.parseEther("0.6"));
    await vaultInstance.setCurrentUtilizationIndex(ethers.parseEther("1000"));
    
    const firstRate = await instance.rate(await vaultInstance.getAddress(), asset);
    
    // Advance time by 100 seconds
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    
    // Update utilization to 70% and index to 1100
    await vaultInstance.setUtilization(ethers.parseEther("0.7"));
    await vaultInstance.setCurrentUtilizationIndex(ethers.parseEther("1100"));
    
    // Second call to rate - should calculate based on elapsed time
    const secondRate = await instance.rate(await vaultInstance.getAddress(), asset);
    
    // The original contract would update the index and calculate elapsed time
    // The mutant using block.prevrandao would never enter the time-update branch
    // and would return a stale/different rate
    
    // If mutant is present, secondRate will equal firstRate (no update happened)
    // If original, secondRate will be different due to time-based multiplier update
    expect(secondRate).to.not.equal(firstRate);
  });
});