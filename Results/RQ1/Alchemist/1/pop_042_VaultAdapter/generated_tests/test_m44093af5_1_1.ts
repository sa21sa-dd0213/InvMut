import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection - m44093af5", function () {
  it("should kill mutant by detecting incorrect multiplier calculation when utilization exceeds kink", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (constructor has no arguments - it only calls _disableInitializers)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault contract to return specific utilization values
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Deploy AccessControl mock for initialization
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Grant access to owner for all selectors
    await accessControl.grantAccess(ethers.id("setSlopes(bytes4,address,address)"), await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(ethers.id("setLimits(uint256,uint256,uint256)"), await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess("0x00000000", await vaultAdapter.getAddress(), owner.address); // for _authorizeUpgrade

    // Initialize the vault adapter
    await vaultAdapter.initialize(await accessControl.getAddress());

    // Setup slopes with kink at 0.5e27 (50%)
    const kink = ethers.parseEther("0.5"); // 0.5e18 but we need 1e27 precision
    const slopes = {
      kink: ethers.parseEther("0.5") * BigInt(1e9), // 0.5e27
      slope0: ethers.parseEther("0.1"), // 10% base rate
      slope1: ethers.parseEther("0.2")  // 20% slope above kink
    };

    await vaultAdapter.setSlopes(await mockVault.getAddress(), slopes);

    // Set limits
    const maxMultiplier = ethers.parseEther("2"); // 2x
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x
    const rate = ethers.parseEther("0.01"); // 1% rate per second

    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);

    // Configure mock vault to return utilization above kink (80%)
    const utilizationAboveKink = ethers.parseEther("0.8") * BigInt(1e9); // 0.8e27
    await mockVault.setUtilization(utilizationAboveKink);
    await mockVault.setCurrentUtilizationIndex(ethers.parseEther("1000")); // arbitrary index

    // First call to rate() to set initial state
    await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // Advance time by 100 seconds to get non-zero elapsed time
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    // Update mock vault utilization index to simulate accumulation
    const newIndex = ethers.parseEther("1100");
    await mockVault.setCurrentUtilizationIndex(newIndex);

    // Call rate() and capture the result
    const interestRate = await vaultAdapter.rate(await mockVault.getAddress(), await mockVault.getAddress());

    // Calculate expected result for ORIGINAL contract:
    // utilization > kink, so:
    // excess = utilization - kink = 0.8e27 - 0.5e27 = 0.3e27
    // multiplier update: multiplier * (1e27 + (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27) / 1e27
    // For original: multiplier = 1e27 * (1e27 + (1e27 * 0.3e27 / 0.5e27) * 100 * 0.01e27 / 1e27) / 1e27
    // = 1e27 * (1e27 + (0.6e27) * 1e27 / 1e27) / 1e27 = 1e27 * (1e27 + 0.6e27) / 1e27 = 1.6e27

    // For mutant: multiplier = 1e27 * (1e27 + (1e27 * 0.3e27 / 0.5e27) + 100 * 0.01e27 / 1e27) / 1e27
    // = 1e27 * (1e27 + 0.6e27 + 1e27) / 1e27 = 2.6e27

    // The mutant would give a DIFFERENT result, so we assert the original expected value
    const expectedMultiplier = ethers.parseEther("1.6") * BigInt(1e9); // 1.6e27
    const expectedRate = (slopes.slope0 + (slopes.slope1 * (ethers.parseEther("0.3") * BigInt(1e9)) / BigInt(1e27))) * expectedMultiplier / BigInt(1e27);

    // If the mutant is present, the result will be different from expectedRate
    expect(interestRate).to.equal(expectedRate);
  });
});