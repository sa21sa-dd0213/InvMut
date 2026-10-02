import { expect } from "chai";
import { ethers } from "hardhat";

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

    // Expected calculation for else branch:
    // multiplier starts at 1e27 (initial), and since elapsed is small,
    // the multiplier stays at 1e27 (minMultiplier check may apply if multiplier drops below)
    // For first call: multiplier = 1e27 * 1e27 / (1e27 + ...) ≈ 1e27
    // For second call: multiplier remains at minMultiplier (0.5e18) if the decay is large enough
    // Let's calculate with the actual formula:
    // utilizationData.multiplier starts at 0 (default uint256)
    // After first call: multiplier = 0 * 1e27 / (1e27 + ...) = 0, then minMultiplier = 0.5e18
    // After second call: multiplier = 0.5e18 * 1e27 / (1e27 + ...)
    // For simplicity, we expect multiplier = minMultiplier = 0.5e18
    // interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // = (0.05e18 * 0.5e18 / 0.8e18) * 0.5e18 / 1e27
    // = 0.03125e18 * 0.5e18 / 1e27
    // = 0.015625e18 / 1e27 * 1e18? Let's compute properly
    
    // Expected calculation:
    // interestRate = (slope0 * utilization / kink) * multiplier / 1e27
    // where multiplier after decay will be minMultiplier (0.5e18)
    const expectedRate = (slope0 * utilizationValue / kink) * minMultiplier / ethers.parseEther("1");

    // Allow for some rounding tolerance due to block timestamp differences
    expect(result).to.be.closeTo(expectedRate, ethers.parseEther("0.001"));
  });
});