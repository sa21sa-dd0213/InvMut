import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m5794d89b - rate function time condition", function () {
  it("should kill the mutant by calling rate twice in the same block", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy VaultAdapter
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock vault contract for testing
    const MockVaultFactory = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Initialize VaultAdapter
    const accessControlAddress = await mockVault.getAddress(); // Using mock as access control for simplicity
    await instance.initialize(accessControlAddress);

    // Set up slopes for an asset
    const asset = ethers.Wallet.createRandom().address;
    const slopes = {
      kink: ethers.parseEther("0.8"), // 80% utilization kink
      slope0: ethers.parseEther("0.05"), // 5% base rate
      slope1: ethers.parseEther("0.5"), // 50% slope above kink
    };

    // Need to grant access to setSlopes
    // For testing purposes, we'll set up the mock vault to grant access
    await mockVault.grantAccess(instance.setSlopes.selector, await instance.getAddress(), owner.address);

    await instance.setSlopes(asset, slopes);

    // Set limits
    await instance.setLimits(
      ethers.parseEther("5"), // maxMultiplier
      ethers.parseEther("0.1"), // minMultiplier
      ethers.parseEther("0.1") // rate
    );

    // First call to rate - should update utilizationData.lastUpdate to current block.timestamp
    await instance.rate(await mockVault.getAddress(), asset);

    // Second call in the same block - this is where the mutant differs
    // Original: block.timestamp == utilizationData.lastUpdate, goes to else branch
    // Mutant: enters if-branch with elapsed = 0, causing division by zero or incorrect calculation
    await expect(
      instance.rate(await mockVault.getAddress(), asset)
    ).to.be.reverted; // Mutant should revert due to division by zero
  });
});

// Mock vault contract for testing
contract MockVault {
    address public accessControl;

    function grantAccess(bytes4 selector, address contractAddr, address caller) external {
        accessControl = caller;
    }

    function checkAccess(bytes4 selector, address contractAddr, address caller) external view returns (bool) {
        return caller == accessControl;
    }

    function currentUtilizationIndex(address asset) external pure returns (uint256) {
        return 1e27; // Return a fixed index
    }

    function utilization(address asset) external pure returns (uint256) {
        return ethers.parseEther("0.5"); // 50% utilization
    }
}