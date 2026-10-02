import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant m2e7121d1 - keeper set to address(this)", function () {
  it("should revert when external keeper address tries to call onlyKeeper functions", async function () {
    const [owner, keeper, addr1] = await ethers.getSigners();
    
    // Deploy the contract - note: this contract has no constructor, it uses initialize()
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // We need to initialize the contract
    // For the test we need to mock/use real token addresses
    // Using zero addresses for tokens as they are not used in this test
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    await instance.initialize(
      zeroAddress,  // _sGlp
      zeroAddress,  // _usdc
      zeroAddress,  // _rewardRouter
      zeroAddress,  // _glpManager
      zeroAddress,  // _dnGmxJuniorVault
      keeper.address  // _keeper - in the mutant this will be replaced with address(this)
    );
    
    // The mutant sets keeper = address(this) instead of keeper = _keeper
    // So the external keeper address should NOT be able to call onlyKeeper functions
    // In the original contract, keeper would be keeper.address
    // In the mutant, keeper would be the contract's own address
    
    // Test that the external keeper cannot call pauseDeposit (onlyKeeper function)
    await expect(
      instance.connect(keeper).pauseDeposit()
    ).to.be.revertedWithCustomError(instance, "CallerNotKeeper");
    
    // Also verify that the contract owner also cannot call onlyKeeper functions
    await expect(
      instance.connect(owner).pauseDeposit()
    ).to.be.revertedWithCustomError(instance, "CallerNotKeeper");
    
    // The only way to call onlyKeeper functions would be from the contract itself
    // which is not possible through external transactions
  });
});