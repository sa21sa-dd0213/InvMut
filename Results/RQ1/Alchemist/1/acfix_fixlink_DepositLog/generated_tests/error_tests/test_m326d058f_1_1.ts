import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant test - m326d058f", function () {
  it("should detect timestamp replacement with block.prevrandao in logGotRedemptionSignature", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve addr1 as a logger
    await instance.connect(owner).setApprovedLogger(addr1.address, true);

    // Capture the block timestamp before calling
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const expectedTimestamp = blockBefore!.timestamp;

    // Call logGotRedemptionSignature from approved logger
    const tx = await instance.connect(addr1).logGotRedemptionSignature(
      ethers.hexlify(ethers.randomBytes(32)),
      ethers.hexlify(ethers.randomBytes(32)),
      ethers.hexlify(ethers.randomBytes(32))
    );
    const receipt = await tx.wait();

    // Get the event from the transaction
    const event = receipt!.logs.find(
      (log: any) => log.topics[0] === ethers.id("GotRedemptionSignature(address,bytes32,bytes32,bytes32,uint256)")
    );
    expect(event).to.not.be.undefined;

    // Decode the event data
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ["bytes32", "bytes32", "uint256"],
      event!.data
    );
    const emittedTimestamp = decoded[2];

    // Assert that the emitted timestamp matches the block timestamp (original behavior)
    // The mutant uses block.prevrandao which will NOT equal block.timestamp, so this test kills it
    expect(emittedTimestamp).to.equal(expectedTimestamp);
  });
});