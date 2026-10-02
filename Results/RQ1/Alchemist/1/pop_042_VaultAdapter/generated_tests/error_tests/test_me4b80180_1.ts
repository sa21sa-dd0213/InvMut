import { expect } from "chai";
import { ethers } } from "hardhat";

describe("VaultAdapter - kill mutant me4b80180", function () {
  it("should compute correct interest rate when utilization is below kink (else branch)", async function () {
    const [owner, vault, asset] = await ethers.getSigners();
    
    // Deploy VaultAdapter (no constructor arguments as per the contract)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize with a mock access control contract
    // Since we need access control, deploy a simple mock that grants all access
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();
    
    // Grant access to the owner for all selectors
    await accessControl.grantAccess(ethers.ZeroHash, await instance.getAddress(), owner.address);
    
    await instance.initialize(await accessControl.getAddress());
    
    // Set slopes with kink > 0 and < 1e27
    const kink = ethers.parseEther("0.8"); // 80% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink
    
    await instance.setSlopes(asset.address, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.1"); // 10% rate
    
    await instance.setLimits(maxMultiplier, minMultiplier, rate);
    
    // To trigger the else branch, we need utilization below kink
    // We'll call rate() directly which will use the else branch on first call
    // since lastUpdate is 0 and utilizationData.index is 0
    
    // The first call will go to the else branch because block.timestamp > lastUpdate (0)
    // and elapsed = block.timestamp - 0, but the condition "elapsed != block.timestamp" is false
    // because elapsed == block.timestamp, so it goes to the else branch
    
    // Calculate expected interest rate for the else branch
    // utilization = IVault(vault).utilization(asset) - we need to mock this
    // Since we can't mock easily, we'll use a scenario where we know the utilization value
    
    // Deploy a simple vault mock that returns known utilization values
    const VaultMockFactory = await ethers.getContractFactory("VaultMock");
    const vaultMock = await VaultMockFactory.deploy();
    await vaultMock.waitForDeployment();
    
    // Set utilization to 50% (below kink of 80%)
    const utilizationValue = ethers.parseEther("0.5");
    await vaultMock.setUtilization(utilizationValue);
    
    // Call rate() to trigger first update (this will go to else branch)
    await instance.rate(await vaultMock.getAddress(), asset.address);
    
    // Now call rate() again - this time elapsed will be small but not zero
    // The else branch will be executed if utilization <= kink
    const result = await instance.rate(await vaultMock.getAddress(), asset.address);
    
    // Expected calculation for else branch (original code):
    // multiplier stays at 1e27 (initial) since no update in else branch for first call
    // interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // = (0.05e18 * 0.5e18 / 0.8e18) * 1e27 / 1e27
    // = (0.03125e18) * 1
    // = 0.03125e18
    
    const expectedRate = (slope0 * utilizationValue / kink) * ethers.parseEther("1") / ethers.parseEther("1");
    
    // The mutant would compute: interestRate = (slope0 * utilization / kink) + multiplier / 1e27
    // = 0.03125e18 + 1e27 / 1e27
    // = 0.03125e18 + 1
    // This is clearly different from the expected value
    
    expect(result).to.equal(expectedRate);
  });
});

// Mock contracts needed for testing
// These should be deployed as separate contracts in the test environment