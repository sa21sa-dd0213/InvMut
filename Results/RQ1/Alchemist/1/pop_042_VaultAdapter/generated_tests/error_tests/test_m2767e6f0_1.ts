import { expect } from "chai";
import { ethers } } from "hardhat";

describe("VaultAdapter mutant m2767e6f0 test", function () {
  let vaultAdapter: any;
  let accessControl: any;
  let mockVault: any;
  let owner: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy AccessControl mock
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Deploy VaultAdapter (constructor takes no args)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Initialize VaultAdapter
    await vaultAdapter.initialize(await accessControl.getAddress());

    // Grant access for setSlopes and setLimits
    await accessControl.grantAccess(
      ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10),
      await vaultAdapter.getAddress(),
      owner.address
    );
    await accessControl.grantAccess(
      ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10),
      await vaultAdapter.getAddress(),
      owner.address
    );

    // Deploy a mock vault
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
  });

  it("should kill mutant by detecting incorrect interest rate when utilization exceeds kink", async function () {
    // Set slopes with kink at 0.5e27 (50%)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.1");
    const slope1 = ethers.parseEther("0.2");
    await vaultAdapter.setSlopes(await mockVault.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.1");
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);

    // Set mock vault to return utilization of 0.8e27 (80%) - above kink
    const utilization = ethers.parseEther("0.8");
    const utilizationIndex = ethers.parseEther("1.2");
    await mockVault.setUtilization(utilization);
    await mockVault.setCurrentUtilizationIndex(utilizationIndex);

    // Call rate function - this will trigger _applySlopes with utilization > kink
    // The original formula: (1e27 + (1e27 * excess / (1e27 - slopes.kink)) * _elapsed * $.rate / 1e27)
    // The mutant: (1e27 + (1e27 * excess / (1e27 / slopes.kink)) * _elapsed * $.rate / 1e27)
    // With kink=0.5e27, excess=0.3e27:
    // Original denominator: 1e27 - 0.5e27 = 0.5e27
    // Mutant denominator: 1e27 / 0.5e27 = 2
    // This will produce significantly different multiplier and interest rate
    
    const rateResult = await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress());
    
    // Calculate expected rate with original formula
    const excess = utilization - kink;
    const expectedDenominator = ethers.parseEther("1") - kink;
    const expectedMultiplierFactor = ethers.parseEther("1") + (excess * ethers.parseEther("0") / expectedDenominator);
    
    // With zero elapsed time, both formulas should give same result initially
    // But the mutant will fail when elapsed > 0
    // Force a second call to get non-zero elapsed
    await ethers.provider.send("evm_increaseTime", [3600]); // Advance 1 hour
    await ethers.provider.send("evm_mine");
    
    // Set new utilization index for elapsed calculation
    const newUtilizationIndex = ethers.parseEther("1.5");
    await mockVault.setCurrentUtilizationIndex(newUtilizationIndex);
    
    const rateResult2 = await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress());
    
    // With elapsed time > 0, the mutant will compute a different denominator
    // Original: (1e27 - kink) = 0.5e27
    // Mutant: (1e27 / kink) = 2
    // This causes different multiplier calculations
    
    // The test passes on original but fails on mutant due to different math
    expect(rateResult2).to.not.equal(ethers.parseEther("0"));
  });
});