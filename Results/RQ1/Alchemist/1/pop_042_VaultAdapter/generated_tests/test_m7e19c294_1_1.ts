import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m7e19c294 - exponentiation vs multiplication", function () {
  it("should detect mutant by comparing interest rate when utilization is above kink", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments needed since constructor() only calls _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault for testing
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    // Setup: initialize the VaultAdapter
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    await instance.initialize(await accessControl.getAddress());

    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = instance.interface.getFunction("setLimits").selector;
    const vaultAdapterAddress = await instance.getAddress();

    await accessControl.grantAccess(setSlopesSelector, vaultAdapterAddress, owner.address);
    await accessControl.grantAccess(setLimitsSelector, vaultAdapterAddress, owner.address);

    // Setup slopes with a kink value
    const kink = ethers.parseEther("0.5"); // 50% utilization
    const slope0 = ethers.parseEther("0.05"); // 5% base rate
    const slope1 = ethers.parseEther("0.1"); // 10% slope above kink

    await instance.setSlopes(await mockVault.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits to allow multiplier changes
    const maxMultiplier = ethers.parseEther("2"); // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.1"); // 10% rate

    await instance.setLimits(maxMultiplier, minMultiplier, rate);

    // Set vault utilization to be above kink (e.g., 80%)
    const utilizationAboveKink = ethers.parseEther("0.8");
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1000"));

    // First call to rate to initialize the utilizationData
    await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // Advance time to ensure elapsed time > 0
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // Now call rate again - this will trigger the _applySlopes with utilization above kink
    // The original code uses multiplication: (slope0 + slope1 * excess / 1e27) * multiplier / 1e27
    // The mutant uses exponentiation: (slope0 + slope1 * excess / 1e27) ** multiplier / 1e27
    // With multiplier > 1, exponentiation will produce much larger values

    const interestRate = await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // Calculate expected value using original logic (multiplication)
    const excess = utilizationAboveKink - kink;
    const baseRate = slope0 + (slope1 * excess / ethers.parseEther("1"));
    const expectedMultiplier = ethers.parseEther("1"); // Initial multiplier is 1e27 (1.0)
    const expectedRate = (baseRate * expectedMultiplier) / ethers.parseEther("1");

    // With exponentiation, the result would be baseRate ** multiplier / 1e27
    // Since multiplier = 1e27 (1.0), baseRate ** 1e27 would overflow or produce astronomical numbers
    // The original multiplication should produce a reasonable value
    // The mutant would either revert (overflow) or produce an extremely large value

    // If the mutant doesn't overflow, the result should be astronomically larger than expected
    if (interestRate > 0n) {
      // For the original, interestRate should be close to expectedRate
      // For the mutant, interestRate would be baseRate ** 1e27 / 1e27 which is enormous
      // A reasonable test: if interestRate is more than 1000x the expected, it's the mutant
      expect(interestRate).to.be.lessThan(expectedRate * 1000n);
    }

    // Alternative: test with a multiplier that's been set to a value > 1
    // Make multiple calls to build up the multiplier
    for (let i = 0; i < 5; i++) {
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
      await ethers.provider.send("evm_mine", []);
      await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());
    }

    // Now get the final interest rate with accumulated multiplier
    const finalRate = await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // The final rate should be a reasonable number (not astronomical)
    // If exponentiation was used, the result would be enormous
    expect(finalRate).to.be.lessThan(ethers.parseEther("1000000")); // Reasonable upper bound
  });
});