import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m2f2455bd - Access control removal", function () {
  let vaultAdapter: any;
  let owner: any;
  let unauthorizedUser: any;
  let accessControl: any;

  before(async function () {
    [owner, unauthorizedUser] = await ethers.getSigners();

    // Deploy a mock access control contract for testing
    const AccessControlFactory = await ethers.getContractFactory("MockAccessControl");
    accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // Deploy VaultAdapter
    const Factory = await ethers.getContractFactory("VaultAdapter");
    vaultAdapter = await Factory.deploy();
    await vaultAdapter.waitForDeployment();

    // Initialize VaultAdapter with access control
    await vaultAdapter.initialize(await accessControl.getAddress());
  });

  it("should revert when unauthorized user calls setSlopes due to access control", async function () {
    // Only grant access to owner, not to unauthorizedUser
    // The unauthorized user should NOT be able to call setSlopes
    
    const slopeData = {
      kink: ethers.parseEther("0.5"), // 0.5 * 10^18, but kink uses 1e27 precision
      slope0: ethers.parseEther("0.1"),
      slope1: ethers.parseEther("0.2")
    };

    // Attempt to call setSlopes from unauthorized address
    await expect(
      vaultAdapter.connect(unauthorizedUser).setSlopes(
        ethers.Wallet.createRandom().address, 
        slopeData
      )
    ).to.be.reverted;
  });
});