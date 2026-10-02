import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant kill test - mc92dbcab", function () {
  it("should kill mutant that replaces _utilization > slopes.kink with false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy VaultAdapter
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a mock vault to interact with
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();
    
    // Initialize the vault adapter
    await instance.initialize(owner.address);
    
    // Set up slopes with a kink value
    const kink = ethers.parseEther("0.8"); // 80% utilization as kink
    const slope0 = ethers.parseEther("0.05"); // 5% base slope
    const slope1 = ethers.parseEther("0.5"); // 50% steep slope
    
    await instance.setSlopes(await mockVault.getAddress(), {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });
    
    // Set limits
    await instance.setLimits(
      ethers.parseEther("2"), // maxMultiplier
      ethers.parseEther("0.5"), // minMultiplier
      ethers.parseEther("0.1") // rate
    );
    
    // Set utilization above kink (e.g., 90%) in mock vault
    const utilizationAboveKink = ethers.parseEther("0.9");
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1.0"));
    
    // Call rate function which should use the steeper slope (slope1) since utilization > kink
    const rateResult = await instance.rate(
      await mockVault.getAddress(),
      await mockVault.getAddress()
    );
    
    // Expected rate with original logic (utilization > kink):
    // excess = 0.9 - 0.8 = 0.1
    // interestRate = (slope0 + (slope1 * excess / 1e27)) * multiplier / 1e27
    // The mutant will always take the else branch, computing with slope0 only
    // This will produce a different (lower) interest rate
    
    // Calculate what the mutant would produce (always using else branch)
    const mutantRate = slope0 * utilizationAboveKink / kink;
    
    // The actual rate should be higher than the mutant's rate because
    // when utilization > kink, slope1 is applied
    expect(rateResult).to.be.gt(mutantRate);
  });
});