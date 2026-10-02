import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant md795d678 detection test", function () {
  it("should revert when unauthorized address calls setL1BlockValues", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The depositorAccount is initially set to address(0) since it's not initialized in constructor
    // We need to ensure the unauthorized caller is NOT the depositorAccount
    // Since depositorAccount is uninitialized (address(0)), any non-zero address is unauthorized
    
    const testNumber = 1;
    const testTimestamp = 2;
    const testBasefee = ethers.parseEther("1");
    const testHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const testSequenceNumber = 3;
    const testBatcherHash = ethers.keccak256(ethers.toUtf8Bytes("batcher"));
    const testL1FeeOverhead = 1000;
    const testL1FeeScalar = 2000;
    
    await expect(
      instance.connect(unauthorized).setL1BlockValues(
        testNumber,
        testTimestamp,
        testBasefee,
        testHash,
        testSequenceNumber,
        testBatcherHash,
        testL1FeeOverhead,
        testL1FeeScalar
      )
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");
  });
});