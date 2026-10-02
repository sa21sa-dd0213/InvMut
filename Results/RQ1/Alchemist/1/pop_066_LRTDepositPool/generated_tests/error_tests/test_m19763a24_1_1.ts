import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - kill mutant m19763a24", function () {
  it("should revert when adding more node delegators than maxNodeDelegatorCount", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock LRTConfig
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // Deploy LRTDepositPool
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(await lrtConfig.getAddress());

    // Grant MANAGER role to owner for setup
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MANAGER"));
    await lrtConfig.grantRole(MANAGER_ROLE, owner.address);
    await lrtConfig.grantRole(DEFAULT_ADMIN_ROLE, owner.address);

    // Set maxNodeDelegatorCount to 2
    await instance.updateMaxNodeDelegatorCount(2);

    // Add 2 node delegator contracts (should succeed)
    const nodeDelegator1 = ethers.Wallet.createRandom().address;
    const nodeDelegator2 = ethers.Wallet.createRandom().address;
    await instance.addNodeDelegatorContractToQueue([nodeDelegator1]);
    await instance.addNodeDelegatorContractToQueue([nodeDelegator2]);

    // Attempt to add a third node delegator (should revert with MaximumNodeDelegatorCountReached)
    const nodeDelegator3 = ethers.Wallet.createRandom().address;
    await expect(
      instance.addNodeDelegatorContractToQueue([nodeDelegator3])
    ).to.be.revertedWithCustomError(instance, "MaximumNodeDelegatorCountReached");
  });
});