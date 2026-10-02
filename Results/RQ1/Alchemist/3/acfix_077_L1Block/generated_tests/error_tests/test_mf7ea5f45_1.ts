import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant mf7ea5f45 test", function () {
  it("should kill mutant by calling setL1BlockValues from depositor account and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The depositor account address from the contract
    const depositorAccount = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";

    // Impersonate the depositor account (needs to be funded for gas in Hardhat)
    await ethers.provider.send("hardhat_impersonateAccount", [depositorAccount]);
    const depositorSigner = await ethers.getSigner(depositorAccount);

    // Fund the depositor account with some ETH for gas
    await owner.sendTransaction({
      to: depositorAccount,
      value: ethers.parseEther("1.0")
    });

    // Call setL1BlockValues from the depositor account - should succeed on original, revert on mutant
    const tx = await instance.connect(depositorSigner).setL1BlockValues(
      1,           // _number
      1234567890,  // _timestamp
      1000000000,  // _basefee
      ethers.hexlify(ethers.randomBytes(32)), // _hash
      5,           // _sequenceNumber
      ethers.hexlify(ethers.randomBytes(32)), // _batcherHash
      100,         // _l1FeeOverhead
      200          // _l1FeeScalar
    );
    
    await expect(tx).to.not.be.reverted;
  });
});