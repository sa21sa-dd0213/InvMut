import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m79653998 - rate function arithmetic change", function () {
  it("should kill the mutant by detecting incorrect utilization calculation when index > utilizationData.index", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor arguments needed - uses _disableInitializers)
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a minimal vault mock for testing
    const VaultMockFactory = await ethers.getContractFactory("VaultMock");
    const vaultMock = await VaultMockFactory.deploy();
    await vaultMock.waitForDeployment();

    // Deploy an AccessControl mock
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Initialize the VaultAdapter
    await vaultAdapter.initialize(await accessControl.getAddress());

    // Set slopes for the asset
    const asset = addr1.address;
    const slopes = {
      kink: ethers.parseEther("0.5"), // 50% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.1") // 10% slope above kink
    };

    // Grant access to owner for setSlopes
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10);
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);

    await vaultAdapter.setSlopes(asset, slopes);

    // Set limits
    const setLimitsSelector = ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10);
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);

    await vaultAdapter.setLimits(
      ethers.parseEther("2"), // maxMultiplier = 2x
      ethers.parseEther("0.5"), // minMultiplier = 0.5x
      ethers.parseEther("0.01") // rate = 1%
    );

    // Setup vault mock to return specific values
    const vaultAddress = await vaultMock.getAddress();

    // First call to rate to set initial utilizationData
    await vaultMock.setUtilizationIndex(ethers.parseEther("0.1")); // index = 0.1
    await vaultMock.setUtilization(ethers.parseEther("0.3")); // utilization = 30%

    // Call rate once to initialize storage with index=0.1 and lastUpdate=block.timestamp
    await vaultAdapter.rate(vaultAddress, asset);

    // Fast forward time by 100 seconds
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    // Set new index higher than previous (0.1 -> 0.3)
    await vaultMock.setUtilizationIndex(ethers.parseEther("0.3"));
    await vaultMock.setUtilization(ethers.parseEther("0.4")); // 40% utilization

    // Now call rate - original: utilization = (0.3 - 0.1) / 100 = 0.002
    // Mutant: utilization = (0.3 + 0.1) / 100 = 0.004
    // This difference will propagate to _applySlopes and produce different results
    const originalResult = await vaultAdapter.rate(vaultAddress, asset);

    // To verify the mutant, we need to compare with expected calculation
    // For original: utilization = 0.002, which is below kink (0.5)
    // For mutant: utilization = 0.004, also below kink
    // The multiplier calculation will differ, causing different final rates

    // Expected original calculation:
    // elapsed = 100
    // utilization = (0.3 - 0.1) * 1e27 / 100 = 0.002 * 1e27
    // multiplier = 1.0 * 1e27 / (1e27 + (1e27 * (0.5 - 0.002) / 0.5) * 100 * 0.01 / 1e27)
    // interestRate = (0.05 * 0.002 / 0.5) * multiplier / 1e27

    // Expected mutant calculation:
    // utilization = (0.3 + 0.1) * 1e27 / 100 = 0.004 * 1e27
    // Different utilization leads to different multiplier and rate

    // The test passes if the result matches original calculation
    // It fails (kills mutant) if result matches mutant calculation

    // Calculate expected original result
    const oneE27 = ethers.parseEther("1000000000000000000"); // 1e18 * 1e9 = 1e27
    // Note: parseEther gives 1e18, we need 1e27 for these calculations

    // For simplicity, we verify the result is NOT what the mutant would produce
    // Mutant would produce utilization = (0.3e18 + 0.1e18) / 100 = 0.004e18
    // Original produces utilization = (0.3e18 - 0.1e18) / 100 = 0.002e18

    // The exact value depends on the internal calculations, but we can check
    // that the result is closer to the original expected value

    // Expected original interest rate (approximate):
    // utilization = 0.002e18
    // multiplier = 1e27 / (1e27 + (1e27 * (0.5e18 - 0.002e18) / 0.5e18) * 100 * 0.01e18 / 1e27)
    // = 1e27 / (1e27 + (0.996e18) * 100 * 0.01e18 / 1e27) ≈ 0.9999e27
    // interestRate = (0.05e18 * 0.002e18 / 0.5e18) * 0.9999e27 / 1e27 ≈ 0.0002e18

    // Expected mutant interest rate (approximate):
    // utilization = 0.004e18
    // multiplier = 1e27 / (1e27 + (1e27 * (0.5e18 - 0.004e18) / 0.5e18) * 100 * 0.01e18 / 1e27)
    // = 1e27 / (1e27 + (0.992e18) * 100 * 0.01e18 / 1e27) ≈ 0.9998e27
    // interestRate = (0.05e18 * 0.004e18 / 0.5e18) * 0.9998e27 / 1e27 ≈ 0.0004e18

    // The mutant result should be approximately double the original
    // So we can check that the result is less than what mutant would produce
    expect(originalResult).to.be.lessThan(ethers.parseEther("0.0003")); // Should be ~0.0002e18
    expect(originalResult).to.be.greaterThan(ethers.parseEther("0.0001")); // Should be ~0.0002e18
  });
});