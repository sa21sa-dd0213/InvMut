import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog - kill mutant m87e1bd20", function () {
  it("should return true when calling logRegisteredPubkey from an approved logger", async function () {
    const [owner, logger] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for DepositLog)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner approves logger
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Call logRegisteredPubkey from approved logger and expect it to return true
    const tx = await instance.connect(logger).logRegisteredPubkey(
      ethers.randomBytes(32),
      ethers.randomBytes(32)
    );
    const receipt = await tx.wait();

    // The function should return true on success; mutant returns false
    // We can check the return value via the transaction response
    const returnValue = await instance.connect(logger).logRegisteredPubkey.staticCall(
      ethers.randomBytes(32),
      ethers.randomBytes(32)
    );
    expect(returnValue).to.equal(true);
  });
});