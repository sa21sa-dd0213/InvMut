import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - mee936704", function () {
  it("should revert when calling setL1BlockValues from the intended depositor address because mutant changed DEPOSITOR_ACCOUNT to address(this)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (constructor takes no arguments in this case)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the depositor account address as defined in the original contract
    const depositorAccount = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    
    // Impersonate the depositor account to call setL1BlockValues
    await ethers.provider.send("hardhat_impersonateAccount", [depositorAccount]);
    const depositorSigner = await ethers.getSigner(depositorAccount);
    
    // Fund the depositor account with some ETH to pay for gas
    await owner.sendTransaction({
      to: depositorAccount,
      value: ethers.parseEther("1.0")
    });

    // Prepare the arguments for setL1BlockValues
    const args = [
      1,                    // _number
      1234567890,          // _timestamp
      ethers.parseEther("0.1"), // _basefee
      ethers.hexlify(ethers.randomBytes(32)), // _hash
      0,                    // _sequenceNumber
      ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
      ethers.parseEther("0.01"), // _l1FeeOverhead
      ethers.parseEther("0.02")  // _l1FeeScalar
    ];

    // Call setL1BlockValues from the depositor account
    // In the original contract this would succeed, but in the mutant it should revert
    // because DEPOSITOR_ACCOUNT is now address(this), not the depositor address
    await expect(
      instance.connect(depositorSigner).setL1BlockValues(...args)
    ).to.be.revertedWith("L1Block: only the depositor account can set L1 block values");

    // Stop impersonating the depositor account
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [depositorAccount]);
  });
});