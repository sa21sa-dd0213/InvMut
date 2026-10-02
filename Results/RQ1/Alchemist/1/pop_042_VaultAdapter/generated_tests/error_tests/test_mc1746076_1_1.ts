import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant mc1746076 test", function () {
  it("should detect mutant that removes utilization fetch when block.timestamp <= lastUpdate", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy VaultAdapter (no constructor args based on code)
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock vault contract that returns utilization > 0
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Deploy access control
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Initialize vault adapter
    await vaultAdapter.initialize(await accessControl.getAddress());

    // Grant access to owner for setSlopes and setLimits
    const setSlopesSelector = ethers.id("setSlopes(address,(uint256,uint256,uint256))").substring(0, 10);
    const setLimitsSelector = ethers.id("setLimits(uint256,uint256,uint256)").substring(0, 10);
    const rateSelector = ethers.id("rate(address,address)").substring(0, 10);
    await accessControl.grantAccess(setSlopesSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(setLimitsSelector, await vaultAdapter.getAddress(), owner.address);
    await accessControl.grantAccess(rateSelector, await vaultAdapter.getAddress(), owner.address);

    // Setup slopes and limits
    const kink = ethers.parseEther("0.8"); // 80% utilization
    const slope0 = ethers.parseEther("0.05");
    const slope1 = ethers.parseEther("0.5");
    const maxMultiplier = ethers.parseEther("2");
    const minMultiplier = ethers.parseEther("0.5");
    const rate = ethers.parseEther("0.1");

    const asset = addr1.address;
    await vaultAdapter.setSlopes(asset, { kink, slope0, slope1 });
    await vaultAdapter.setLimits(maxMultiplier, minMultiplier, rate);

    // Set mock vault to return 50% utilization
    const mockUtilization = ethers.parseEther("0.5");
    await mockVault.setUtilization(mockUtilization);

    // First call to rate() - this will set lastUpdate and index
    await vaultAdapter.rate(await mockVault.getAddress(), asset);

    // Mine a block to ensure timestamp advances
    await ethers.provider.send("evm_mine", []);

    // Second call to rate() - now block.timestamp > lastUpdate, so it uses the index path
    await vaultAdapter.rate(await mockVault.getAddress(), asset);

    // Third call to rate() in the same block - now block.timestamp == lastUpdate
    // In the original, this would call IVault(_vault).utilization(_asset)
    // In the mutant, utilization stays 0
    const result = await vaultAdapter.rate(await mockVault.getAddress(), asset);

    // If the mutant is present, utilization would be 0, leading to interest rate of 0
    // If original, utilization would be 50%, leading to non-zero interest rate
    expect(result).to.not.equal(0);
  });
});