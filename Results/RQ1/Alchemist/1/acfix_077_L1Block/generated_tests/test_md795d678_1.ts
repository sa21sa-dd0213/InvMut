import { expect } from "chai";
import { ethers } } from "hardhat";

describe("L1Block mutant detection test", function () {
  it("should revert when unauthorized address calls setL1BlockValues", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the depositor account address from the contract
    const depositorAccount = await instance.depositorAccount();
    
    // Verify that owner is not the depositor account
    expect(owner.address).to.not.equal(depositorAccount, "Test setup issue: owner should not be depositor");
    
    // Attempt to call setL1BlockValues from an unauthorized address (owner)
    await expect(
      instance.connect(owner).setL1BlockValues(
        1,           // _number
        1000000,     // _timestamp
        ethers.parseEther("1"), // _basefee
        ethers.hexlify(ethers.randomBytes(32)), // _hash
        0,           // _sequenceNumber
        ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
        0,           // _l1FeeOverhead
        0            // _l1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});