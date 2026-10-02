import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Mutant m1e63f71b (onlyKeeper modifier)", function () {
  let instance: any;
  let owner: any;
  let keeper: any;
  let nonKeeper: any;

  beforeEach(async function () {
    [owner, keeper, nonKeeper] = await ethers.getSigners();
    
    // Deploy the contract with minimal required constructor arguments
    // Since the contract uses initializer pattern, we need to deploy first
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize with dummy addresses for the required parameters
    // Using zero addresses as placeholders since we only need to test the modifier
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    await instance.initialize(
      zeroAddress, // _sGlp
      zeroAddress, // _usdc
      zeroAddress, // _rewardRouter
      zeroAddress, // _glpManager
      zeroAddress, // _dnGmxJuniorVault
      keeper.address // _keeper - set the keeper
    );
  });

  it("should revert when non-keeper calls a keeper-only function, and succeed when keeper calls it", async function () {
    // Test that non-keeper cannot call the keeper function
    await expect(
      instance.connect(nonKeeper).pauseDeposit()
    ).to.be.revertedWithCustomError(instance, "CallerNotKeeper");

    // Test that keeper can successfully call the keeper function
    await expect(
      instance.connect(keeper).pauseDeposit()
    ).to.not.be.reverted;
  });
});