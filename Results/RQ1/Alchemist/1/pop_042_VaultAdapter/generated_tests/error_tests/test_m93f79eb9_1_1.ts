import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m93f79eb9 test", function () {
  it("should kill mutant by detecting incorrect interest rate when utilization is above kink", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments needed)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Deploy AccessControl
    const AccessControlFactory = await ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Initialize VaultAdapter
    await vaultAdapter.initialize(await accessControl.getAddress());

    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10);
    const setLimitsSelector = ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10);
    const rateSelector = ethers.id("rate(address,address)").substring(0, 10);

    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(rateSelector, await vaultAdapter.getAddress(), owner.address);

    // Set slopes with kink, slope0, and slope1
    const kink = ethers.parseEther("0.5"); // 50% utilization as kink
    const slope0 = ethers.parseEther("0.1"); // 10% base slope
    const slope1 = ethers.parseEther("0.3"); // 30% excess slope

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

    // Set mock vault to return utilization above kink (e.g., 80%)
    const utilizationAboveKink = ethers.parseEther("0.8");
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.5"));

    // Call rate function - this should trigger the _applySlopes with utilization > kink
    const tx = await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress());
    const receipt = await tx.wait();

    // The test should fail on the mutant because the interest rate calculation is wrong
    // Original: interestRate = (slope0 + (slope1 * excess / 1e27)) * multiplier / 1e27
    // Mutant: interestRate = (slope0 * (slope1 * excess / 1e27)) * multiplier / 1e27

    // With utilization 0.8, kink 0.5, excess = 0.3
    // Original would give: (0.1 + (0.3 * 0.3 / 1)) * 1 / 1 = 0.19
    // Mutant would give: (0.1 * (0.3 * 0.3 / 1)) * 1 / 1 = 0.009

    // The test expects the correct value from the original formula
    const expectedInterestRate = ethers.parseEther("0.19"); // Expected value from original formula

    // This assertion will fail on the mutant since it produces a different value
    expect(await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress())).to.equal(expectedInterestRate);
  });
});