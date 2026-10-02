import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m0cdc2d35 test", function () {
  it("should kill mutant by detecting overflow/incorrect rate when utilization exceeds kink", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments needed - uses _disableInitializers())
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault to return utilization values
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Initialize the VaultAdapter
    // We need an access control contract - deploy a simple one
    const AccessControlFactory = await ethers.getContractFactory("SimpleAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    await vaultAdapter.initialize(await accessControl.getAddress());

    // Grant access to the owner for setSlopes and setLimits
    const setSlopesSelector = vaultAdapter.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = vaultAdapter.interface.getFunction("setLimits").selector;
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);

    // Set slopes with a reasonable kink value
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink
    await vaultAdapter.setSlopes(await mockVault.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x max multiplier
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min multiplier
    const rate = ethers.parseEther("0.1"); // 10% rate
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);

    // Configure mock vault to return utilization above kink (e.g., 80%)
    await mockVault.setUtilization(ethers.parseEther("0.8"));
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1000"));

    // First call to rate to initialize the utilization data
    await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // Advance time to ensure elapsed > 0
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // Set a new utilization index to create delta for elapsed calculation
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("2000"));

    // Now call rate - the mutant will use exponentiation instead of multiplication
    // This should either overflow or produce an astronomically large result
    const assetAddress = await mockVault.getAddress();

    // The mutant calculation: multiplier = multiplier ** (1e27 + ...) / 1e27
    // With exponentiation of a large exponent, this will overflow or produce huge number
    // The original: multiplier = multiplier * (1e27 + ...) / 1e27

    // We expect either:
    // 1. The transaction to revert due to overflow
    // 2. Or produce a result that is clearly wrong (> 100% or unreasonable)

    try {
      const tx = await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);
      const receipt = await tx.wait();

      // If it didn't revert, the result should be unreasonable
      // Get the rate from the event or call again
      // The rate should be within reasonable bounds (0-100%)
      const result = await vaultAdapter.rate.staticCall(await mockVault.getAddress(), assetAddress);

      // The mutant will produce an astronomically large result due to exponentiation
      // Original would produce a reasonable rate (e.g., less than 10^18 or 1 ether)
      expect(result).to.be.lessThan(ethers.parseEther("100")); // Should be less than 10000%

      // Actually, the mutant will likely overflow and revert, or produce > 10^60 which is impossible
      // Let's check if it's unreasonably large
      const maxReasonableRate = ethers.parseEther("10"); // 1000% max reasonable
      expect(result).to.be.lessThan(maxReasonableRate);

    } catch (error: any) {
      // If it reverts with overflow, that's also a kill - the original should work
      expect(error.message).to.include("overflow");
    }
  });
});