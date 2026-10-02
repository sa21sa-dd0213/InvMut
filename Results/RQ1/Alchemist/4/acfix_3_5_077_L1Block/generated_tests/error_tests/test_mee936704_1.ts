import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - mee936704", function () {
  it("should revert when called from the hardcoded depositor address, killing the mutant that changed DEPOSITOR_ACCOUNT to address(this)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the contract (constructor takes no arguments since it inherits Semver(1,0,0))
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a signer for the hardcoded depositor address
    const depositorAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    const depositorSigner = await ethers.getImpersonatedSigner(depositorAddress);
    
    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: depositorAddress,
      value: ethers.parseEther("1")
    });
    
    // Prepare test parameters
    const testNumber = 1;
    const testTimestamp = 2;
    const testBasefee = ethers.parseEther("1");
    const testHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const testSequenceNumber = 3;
    const testBatcherHash = ethers.keccak256(ethers.toUtf8Bytes("batcher"));
    const testL1FeeOverhead = 1000;
    const testL1FeeScalar = 2000;
    
    // This should revert on the mutant because address(this) != depositor address
    // but should pass on the original where DEPOSITOR_ACCOUNT == depositor address
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(
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