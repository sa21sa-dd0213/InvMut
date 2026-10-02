import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter - kill mutant m1b9c35bd (multiplier > maxMultiplier changed to <)", function () {
  let vaultAdapter: any;
  let owner: any;
  let mockVault: any;
  let mockAccessControl: any;
  let assetAddress: string;

  before(async function () {
    [owner] = await ethers.getSigners();

    // Deploy mock access control that allows all access
    const MockAccessControl = await ethers.getContractFactory("MockAccessControl");
    mockAccessControl = await MockAccessControl.deploy();
    await mockAccessControl.waitForDeployment();

    // Deploy mock vault that returns specific utilization values
    const MockVault = await ethers.getContractFactory("MockVault");
    mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    assetAddress = ethers.Wallet.createRandom().address;
  });

  beforeEach(async function () {
    // Deploy fresh VaultAdapter for each test
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    await vaultAdapter.initialize(await mockAccessControl.getAddress());
  });

  it("should cap multiplier at maxMultiplier when multiplier exceeds maxMultiplier", async function () {
    // Setup: Set slopes with kink value
    const kink = ethers.parseEther("0.8"); // 80% utilization kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.5"); // 50% slope above kink

    await vaultAdapter.setSlopes(assetAddress, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits with low maxMultiplier to force capping
    const maxMultiplier = ethers.parseEther("2"); // 2x multiplier cap
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x min multiplier
    const rate = ethers.parseEther("1"); // 1x rate

    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);

    // Configure mock vault to return high utilization (above kink)
    const highUtilization = ethers.parseEther("0.9"); // 90% utilization
    const currentIndex = ethers.parseEther("1000");

    // Set mock vault to return specific values
    await mockVault.setUtilization(highUtilization);
    await mockVault.setCurrentUtilizationIndex(currentIndex);

    // First call to rate() to initialize multiplier and set lastUpdate
    await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);

    // Advance time to allow multiplier to grow
    await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds
    await ethers.provider.send("evm_mine", []);

    // Configure mock vault to return even higher utilization
    const evenHigherUtilization = ethers.parseEther("0.95"); // 95% utilization
    await mockVault.setUtilization(evenHigherUtilization);

    // Call rate() again - this should trigger the multiplier update
    // In original: if multiplier > maxMultiplier, cap it
    // In mutant: if multiplier < maxMultiplier, cap it (wrong behavior)
    const result = await vaultAdapter.rate(await mockVault.getAddress(), assetAddress);

    // The interest rate should be calculated using the capped multiplier (maxMultiplier)
    // In the mutant, the multiplier would NOT be capped because it's > maxMultiplier (not <)
    // So we expect a different (higher) interest rate from the mutant

    // Calculate expected interest rate with capped multiplier
    // utilization > kink path: interestRate = (slope0 + (slope1 * excess / 1e27)) * maxMultiplier / 1e27
    const excess = evenHigherUtilization - kink;
    const expectedBaseRate = slope0 + (slope1 * excess / ethers.parseEther("1"));
    const expectedCappedRate = expectedBaseRate * maxMultiplier / ethers.parseEther("1");

    // In original: result should equal expectedCappedRate
    // In mutant: result would be higher because multiplier is not capped
    expect(result).to.equal(expectedCappedRate);
  });
});