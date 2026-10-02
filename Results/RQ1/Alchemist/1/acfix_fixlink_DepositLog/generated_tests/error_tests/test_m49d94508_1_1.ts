import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - m49d94508", function () {
  it("should emit Liquidated event with block.timestamp, not block.prevrandao", async function () {
    const [owner, logger] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve logger address
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Capture block timestamp before calling
    const blockBefore = await ethers.provider.getBlock("latest");
    const expectedTimestamp = blockBefore!.timestamp;

    // Call logLiquidated from approved logger
    const tx = await instance.connect(logger).logLiquidated();
    const receipt = await tx.wait();

    // Get the event
    const event = receipt!.logs.find(
      (log: any) => log.topics[0] === ethers.id("Liquidated(address,uint256)")
    );

    // Decode the event data
    const decodedEvent = ethers.AbiCoder.defaultAbiCoder().decode(
      ["address", "uint256"],
      event!.data
    );

    // Assert the timestamp equals block.timestamp (not prevrandao)
    expect(decodedEvent[1]).to.equal(expectedTimestamp);

    // Also verify it's not zero or prevrandao-like value
    expect(decodedEvent[1]).to.not.equal(0);
  });
});