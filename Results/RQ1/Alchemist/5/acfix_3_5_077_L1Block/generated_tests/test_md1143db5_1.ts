import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - md1143db5", function () {
  it("should revert when non-depositor calls setL1BlockValues", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (constructor takes no arguments per the original)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify the depositor account constant
    const DEPOSITOR_ACCOUNT = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    
    // Attempt to call setL1BlockValues from an unauthorized address (addr1)
    // This should revert in the original contract, but would succeed in the mutant
    const tx = instance.connect(addr1).setL1BlockValues(
      1,          // _number
      123456789,  // _timestamp
      ethers.parseEther("100"), // _basefee
      ethers.hexlify(ethers.randomBytes(32)), // _hash
      0,          // _sequenceNumber
      ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
      ethers.parseEther("1"),  // _l1FeeOverhead
      ethers.parseEther("0.1") // _l1FeeScalar
    );
    
    await expect(tx).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});