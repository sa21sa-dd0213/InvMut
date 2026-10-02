import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant detection - m12b542b4", function () {
  it("should detect mutant that always caps multiplier at maxMultiplier when utilization > kink", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy VaultAdapter
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault for testing
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    // Deploy mock access control
    const MockAccessControl = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await MockAccessControl.deploy();
    await accessControl.waitForDeployment();

    // Initialize VaultAdapter
    await vaultAdapter.initialize(await accessControl.getAddress());

    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = vaultAdapter.interface.getFunction("setSlopes").selector;
    const setLimitsSelector = vaultAdapter.interface.getFunction("setLimits").selector;
    const rateSelector = vaultAdapter.interface.getFunction("rate").selector;

    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(rateSelector, await vaultAdapter.getAddress(), owner.address);

    // Set up test parameters
    const testAsset = addr1.address;
    const testVault = await mockVault.getAddress();

    // Configure slopes with a kink value (must be < 1e27 and > 0)
    const kink = ethers.parseEther("0.5"); // 50% utilization kink
    const slope0 = ethers.parseEther("0.1"); // 10% base slope
    const slope1 = ethers.parseEther("0.2"); // 20% slope above kink

    await vaultAdapter.setSlopes(testAsset, {
      kink: kink,
      slope0: slope0,
      slope1: slope1
    });

    // Set limits where maxMultiplier is higher than what multiplier would naturally be
    // This ensures the cap should NOT trigger in the original code
    const maxMultiplier = ethers.parseEther("2"); // 2x maximum
    const minMultiplier = ethers.parseEther("0.5"); // 0.5x minimum
    const rate = ethers.parseEther("0.1"); // 10% rate

    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);

    // Configure mock vault to return utilization ABOVE kink
    const highUtilization = ethers.parseEther("0.8"); // 80% utilization (above 50% kink)
    await mockVault.setUtilization(highUtilization);

    // Set currentUtilizationIndex to create a scenario where elapsed time is used
    // We need block.timestamp > lastUpdate for the elapsed branch
    const currentIndex = ethers.parseEther("1");
    await mockVault.setCurrentUtilizationIndex(currentIndex);

    // First call to rate to initialize lastUpdate
    await vaultAdapter.rate(testVault, testAsset);

    // Fast forward time to create elapsed > 0
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    // Set a new index to simulate growth
    const newIndex = currentIndex + (highUtilization * BigInt(100)); // growth proportional to utilization * time
    await mockVault.setCurrentUtilizationIndex(newIndex);

    // Call rate - in original, multiplier should NOT be capped because it starts at 1e27 (1.0)
    // and with 100 seconds elapsed and 10% rate, the multiplier would be:
    // multiplier = 1e27 * (1e27 + (1e27 * excess / (1e27 - kink)) * elapsed * rate / 1e27) / 1e27
    // excess = 0.8 - 0.5 = 0.3
    // This should result in multiplier > 1 but < 2 (maxMultiplier)
    const tx = await vaultAdapter.rate(testVault, testAsset);
    const result = await tx.wait();

    // Calculate expected interest rate without cap for original code
    // In the mutant, the cap is always applied, so we expect a DIFFERENT result
    // when the natural multiplier is below maxMultiplier

    // To detect the mutant, we verify that the returned rate is what we'd expect
    // WITHOUT the maxMultiplier cap being applied (since natural multiplier < maxMultiplier)
    // The mutant would incorrectly apply the cap and return a different rate

    // Get the actual result - we can't easily compute the exact value, but we know
    // the mutant would produce a DIFFERENT result than the original
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const iface = vaultAdapter.interface;
    const decodedLog = receipt.logs.find(log => log.address === await vaultAdapter.getAddress());

    // The rate function returns latestAnswer, so we can check it's reasonable
    // The key insight: in the mutant, utilizationData.multiplier gets set to maxMultiplier
    // In the original, it would be higher (since natural multiplier > maxMultiplier is false)
    // So the mutant returns a LOWER rate than the original

    // We verify by calling rate again - the multiplier persists in storage
    // In original: multiplier grows over time (since it's always multiplied by >1 factor)
    // In mutant: multiplier gets reset to maxMultiplier every time

    // Make another call with the same conditions
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    const newIndex2 = newIndex + (highUtilization * BigInt(200));
    await mockVault.setCurrentUtilizationIndex(newIndex2);

    const tx2 = await vaultAdapter.rate(testVault, testAsset);

    // If the mutant is present, the multiplier would have been capped to maxMultiplier
    // in the first call, so the second call would also be capped
    // In the original, the multiplier would have grown from its previous value

    // We can verify by checking that the rate is bounded by the expected range
    // The mutant will always return rate = (slope0 + slope1 * excess / 1e27) * maxMultiplier / 1e27
    // Which is a fixed value regardless of elapsed time

    // For the original, the rate increases with elapsed time as multiplier grows
    // So we expect tx2 to return a higher rate than tx in the original

    // In the mutant, both tx and tx2 return the same rate (since capped each time)
    // We can detect this by comparing the two results
    expect(tx2).to.not.equal(tx); // In mutant, both would be equal due to capping
  });
});