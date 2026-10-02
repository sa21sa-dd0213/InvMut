import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mc61cc502 detection", function () {
  it("should detect exponentiation mutant by calling rate() with utilization below kink", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments needed as it's upgradeable)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault for testing
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    // Initialize VaultAdapter
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    await instance.initialize(await accessControl.getAddress());

    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    const rateSelector = instance.interface.getFunction("rate").selector;

    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await instance.getAddress(), owner.address);
    await accessControl.grantAccess(rateSelector, await instance.getAddress(), owner.address);

    // Set up slopes with kink at 50% (0.5e27)
    const kink = ethers.parseEther("0.5");
    const slope0 = ethers.parseEther("0.1"); // 10% base slope
    const slope1 = ethers.parseEther("0.5"); // 50% excess slope
    await instance.setSlopes(await mockVault.getAddress(), { kink, slope0, slope1 });

    // Set limits
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.1");
    await instance.setLimits(maxMultiplier, minMultiplier, rate);

    // Configure mock vault to return utilization below kink (e.g., 10%)
    const utilizationBelowKink = ethers.parseEther("0.1"); // 10% utilization
    await mockVault.setUtilization(utilizationBelowKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1"));

    // Call rate() - this should trigger the else branch where the mutant exists
    // The mutant replaces 1e27 * (kink - utilization) with 1e27 ** (kink - utilization)
    // With kink = 0.5e27 and utilization = 0.1e27, the exponent would be 0.4e27
    // This would cause massive overflow or produce a mathematically impossible result

    const assetAddress = await mockVault.getAddress();

    // The original contract would produce a reasonable interest rate
    // The mutant would either revert due to overflow or produce an astronomically large number
    try {
      const result = await instance.rate(await mockVault.getAddress(), assetAddress);

      // If we get here without revert, check that result is reasonable (not astronomical)
      // The original formula would give: slope0 * utilization / kink * multiplier
      // With our values: 0.1 * 0.1 / 0.5 = 0.02, times multiplier (initially 1) = 0.02
      // The mutant would give something like 1e27^0.4e27 which is impossible
      const resultNum = Number(ethers.formatEther(result));

      // In the mutant, the result would be either extremely large or overflow to 0
      // A reasonable result should be around 0.02 * 1e18 = 2e16 wei
      expect(resultNum).to.be.lessThan(1); // Should be less than 1 ETH worth
      expect(resultNum).to.be.greaterThan(0); // Should be positive

      // If we reach here, the mutant might have produced a seemingly valid result
      // But we can check the storage to see if multiplier was modified incorrectly
      // Actually, the mutation affects the multiplier calculation, so let's check
      // that the multiplier wasn't set to max/min due to overflow
      const storageSlot = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "address", "uint256"],
          [await mockVault.getAddress(), assetAddress, 2] // multiplier is at slot 2
        )
      );

      // This is a simplified check - in reality we'd need to verify the exact storage layout
      // But the key assertion is that calling rate() with utilization below kink should
      // expose the mathematical error in the mutant

    } catch (error: any) {
      // If the mutant causes an overflow revert, that also kills it
      expect(error.message).to.include("overflow");
    }
  });
});