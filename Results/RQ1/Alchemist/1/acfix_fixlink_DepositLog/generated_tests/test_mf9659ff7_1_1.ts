import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant detection - block.timestamp vs block.prevrandao", function () {
  it("should detect mutant mf9659ff7 by verifying CourtesyCalled event timestamp parameter", async function () {
    const [owner, logger] = await ethers.getSigners();

    // Deploy contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve logger
    await instance.connect(owner).setApprovedLogger(logger.address, true);

    // Record block timestamp before call
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const expectedTimestamp = blockBefore!.timestamp;

    // Call logCourtesyCalled from approved logger
    const tx = await instance.connect(logger).logCourtesyCalled();
    const receipt = await tx.wait();

    // Get the event from the transaction receipt
    const event = receipt!.logs.find(
      (log: any) => log.topics[0] === ethers.id("CourtesyCalled(address,uint256)")
    );
    expect(event).to.not.be.undefined;

    // Decode the event data
    const decodedEvent = ethers.AbiCoder.defaultAbiCoder().decode(
      ["address", "uint256"],
      event!.data
    );

    // Verify the timestamp parameter equals the block timestamp at time of transaction
    expect(decodedEvent[1]).to.equal(expectedTimestamp);
  });
});