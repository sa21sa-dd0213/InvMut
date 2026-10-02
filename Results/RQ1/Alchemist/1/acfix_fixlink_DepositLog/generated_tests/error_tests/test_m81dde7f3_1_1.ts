import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog - kill mutant m81dde7f3 (logRedeemed)", function () {
  it("should emit Redeemed event when called by approved logger, mutant returns false instead", async function () {
    const [owner, logger, other] = await ethers.getSigners();

    // Deploy contract - no constructor arguments for DepositLog
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve logger
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Verify logger is approved
    expect(await instance.approvedToLog(logger.address)).to.equal(true);

    // Call logRedeemed as approved logger - should emit event in original, return false in mutant
    const tx = await instance.connect(logger).logRedeemed(
      ethers.hexlify(ethers.randomBytes(32)) // random txid
    );

    // In the original, this would emit Redeemed event
    // In the mutant, it returns false without emitting
    const receipt = await tx.wait();

    // Check that the Redeemed event was emitted
    expect(receipt).to.not.be.undefined;

    // Get the event from logs
    const event = receipt!.logs.find(
      (log: any) => log.topics[0] === ethers.id("Redeemed(address,bytes32,uint256)")
    );

    // In original: event exists and function returns true
    // In mutant: no event emitted and function returns false
    expect(event).to.not.be.undefined;

    // Additionally verify the function returns true (original behavior)
    // Re-call to check return value (mutant returns false)
    const result = await instance.connect(logger).logRedeemed.staticCall(
      ethers.hexlify(ethers.randomBytes(32))
    );
    expect(result).to.equal(true);
  });

  it("should fail to emit Redeemed event when called by non-approved address", async function () {
    const [owner, logger, nonApproved] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve logger but not nonApproved
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Call logRedeemed from non-approved address - should return false
    const result = await instance.connect(nonApproved).logRedeemed.staticCall(
      ethers.hexlify(ethers.randomBytes(32))
    );
    expect(result).to.equal(false);
  });
});