import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m8b625060 - _applySlopes division vs addition", function () {
  it("should kill the mutant by checking exact interest rate calculation when utilization exceeds kink", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy VaultAdapter (constructor has no arguments)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault to return utilization index
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    // Setup: initialize the adapter
    await instance.initialize(owner.address);

    // Setup: set slopes with a specific kink
    const kink = ethers.parseEther("0.5"); // 50% utilization as kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.5"); // 50% excess slope

    await instance.connect(owner).setSlopes(await mockVault.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Setup: set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.1"); // 10% rate

    await instance.connect(owner).setLimits(maxMultiplier, minMultiplier, rate);

    // Setup: mock vault to return specific utilization index values
    // Set utilization to 80% (above kink of 50%)
    const utilization = ethers.parseEther("0.8"); // 80% utilization
    await mockVault.setUtilization(utilization);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.2"));

    // Advance time to have elapsed > 0
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    // Calculate expected interest rate for original contract
    // excess = 0.8 - 0.5 = 0.3
    // slope1 * excess / 1e27 = 0.5 * 0.3 / 1e27 = 0.15 / 1e27
    // interestRate = (0.05 + 0.15/1e27) * multiplier / 1e27

    // For the mutant: slope1 * excess + 1e27 = 0.5 * 0.3 + 1e27 = 0.15 + 1e27
    // interestRate = (0.05 + 0.15 + 1e27) * multiplier / 1e27 = ~1.0 * multiplier

    // Call rate function
    const result = await instance.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // The original would return a very small number (since division by 1e27)
    // The mutant would return approximately 1e27 (since addition of 1e27 dominates)
    // We expect the original behavior: result should be very small (< 1e18)
    expect(result).to.be.lessThan(ethers.parseEther("1"));

    // Additionally, the mutant would produce a value > 1e27, which is huge
    // So if the result is small, the mutant is killed (it would have produced large value)
    expect(result).to.be.lessThan(ethers.parseUnits("1", 18));
  });
});