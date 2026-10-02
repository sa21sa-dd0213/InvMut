import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant kill test - unpause access control", function () {
  it("should revert when non-admin tries to unpause (detect removed onlyLRTAdmin modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LRTConfig mock or use a real deployment setup
    // Since LRTDepositPool requires an LRTConfig address in initialize,
    // we need to deploy a minimal mock that implements ILRTConfig interface
    const LRTConfigMock = await ethers.getContractFactory("LRTConfigMock");
    const lrtConfigMock = await LRTConfigMock.deploy();
    await lrtConfigMock.waitForDeployment();

    // Deploy LRTDepositPool
    const LRTDepositPool = await ethers.getContractFactory("LRTDepositPool");
    const depositPool = await LRTDepositPool.deploy();
    await depositPool.waitForDeployment();

    // Initialize the contract
    await depositPool.initialize(await lrtConfigMock.getAddress());

    // First, pause the contract using an authorized manager
    // For the test to work, we need to grant MANAGER role to owner
    // The LRTConfig mock should have this setup
    await lrtConfigMock.grantManagerRole(owner.address);
    await depositPool.connect(owner).pause();

    // Now attempt to unpause from an unauthorized address (addr1)
    // The original contract should revert because addr1 is not LRTAdmin
    // The mutant would allow this to succeed (removed onlyLRTAdmin modifier)
    await expect(
      depositPool.connect(addr1).unpause()
    ).to.be.revertedWith(
      "CallerNotLRTConfigAdmin" // The error from ILRTConfig.CallerNotLRTConfigAdmin
    );
  });
});