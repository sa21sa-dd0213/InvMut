import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m9a5b092d - _applySlopes exponentiation mutation", function () {
  it("should kill the mutant by detecting incorrect interest rate calculation when utilization exceeds kink", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy VaultAdapter (constructor has no arguments - it calls _disableInitializers())
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault contract that implements IVault interface for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Deploy a mock access control contract
    const MockAccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const mockAccessControl = await MockAccessControlFactory.deploy();
    await mockAccessControl.waitForDeployment();

    // Initialize the vault adapter with the access control
    await vaultAdapter.initialize(await mockAccessControl.getAddress());

    // Grant access to the owner for setSlopes and setLimits functions
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10);
    const setLimitsSelector = ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10);
    const rateSelector = ethers.id("rate(address,address)").substring(0, 10);

    await mockAccessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    await mockAccessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);
    await mockAccessControl.grantAccess(rateSelector, await vaultAdapter.getAddress(), owner.address);

    // Set up slope data with kink at 50% (0.5e27)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.05"); // 5% base rate
    const slope1 = ethers.parseEther("0.1");  // 10% slope above kink

    await vaultAdapter.setSlopes(await mockVault.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x max
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min
    const rate = ethers.parseEther("0.1"); // 10% rate parameter

    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);

    // Configure mock vault to return utilization above kink (e.g., 80% = 0.8e27)
    const utilizationAboveKink = ethers.parseEther("0.8");
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));

    // First call to rate() to set up the initial utilization data
    await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // Now set a new utilization to trigger the above-kink calculation with non-zero elapsed time
    await mockVault.setUtilization(ethers.parseEther("0.9"));
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.5"));

    // Fast forward time to create elapsed time
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);

    // Call rate() - this will trigger the mutated code path
    const result = await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // Calculate expected interest rate using original formula
    // excess = 0.9e27 - 0.5e27 = 0.4e27
    const excess = BigInt(ethers.parseEther("0.9")) - BigInt(ethers.parseEther("0.5"));

    // A reasonable interest rate should be less than 100% (1e27) for this scenario
    expect(result).to.be.lessThan(ethers.parseEther("1"));

    // The mutant would produce a result that is either:
    // 1) Extremely large (if exponentiation doesn't overflow)
    // 2) Causes a revert due to overflow
    // Either way, the test would fail if the mutant is present

    // Additionally, we can verify the result is non-zero and positive
    expect(result).to.be.gt(0);

    // If we call rate() again, the multiplier should be capped by maxMultiplier
    // The mutant would likely cause an overflow revert on this second call
    await expect(
      vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress())
    ).to.not.be.reverted;
  });
});