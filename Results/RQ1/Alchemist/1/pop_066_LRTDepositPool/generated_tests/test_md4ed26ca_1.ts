import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool mutant md4ed26ca - updateMaxNodeDelegatorCount without onlyLRTAdmin", function () {
  it("should revert when non-admin calls updateMaxNodeDelegatorCount on original contract, but succeed on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy LRTConfig first (required by LRTDepositPool)
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();
    
    // Deploy LRTDepositPool (no constructor arguments needed - it uses _disableInitializers)
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(await lrtConfig.getAddress());
    
    // Grant DEFAULT_ADMIN_ROLE to owner (needed for initialization setup)
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    await lrtConfig.grantRole(DEFAULT_ADMIN_ROLE, owner.address);
    
    // Now test: non-admin (addr1) tries to call updateMaxNodeDelegatorCount
    // On the original contract with onlyLRTAdmin modifier, this should revert
    // On the mutant without the modifier, this would succeed
    await expect(
      instance.connect(addr1).updateMaxNodeDelegatorCount(20)
    ).to.be.revertedWith("CallerNotLRTConfigAdmin");
    
    // Verify the value didn't change (original contract behavior)
    expect(await instance.maxNodeDelegatorCount()).to.equal(10);
  });
});