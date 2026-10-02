import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m901dfdb1 - logRegisteredPubkey timestamp", function () {
  it("should emit RegisteredPubkey event with correct block.timestamp parameter", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve the owner as a logger
    await instance.connect(owner).setApprovedLogger(owner.address, true);

    // Get current block timestamp before the transaction
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore!.timestamp;

    // Call logRegisteredPubkey and capture the event
    const tx = await instance.connect(owner).logRegisteredPubkey(
      ethers.encodeBytes32String("pubkeyX"),
      ethers.encodeBytes32String("pubkeyY")
    );
    const receipt = await tx.wait();

    // Get the event from the logs
    const event = receipt!.logs.find(
      (log: any) => log.topics[0] === ethers.id("RegisteredPubkey(address,bytes32,bytes32,uint256)")
    );
    expect(event).to.not.be.undefined;

    // Decode the event data to get the timestamp parameter (4th parameter)
    const abiCoder = new ethers.AbiCoder();
    const decodedData = abiCoder.decode(
      ["address", "bytes32", "bytes32", "uint256"],
      event!.data
    );
    const timestamp = decodedData[3];

    // Verify timestamp is within a reasonable range (current block time or later)
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const timestampAfter = blockAfter!.timestamp;

    // The timestamp should be between the block before and after the transaction
    expect(timestamp).to.be.at.least(timestampBefore);
    expect(timestamp).to.be.at.most(timestampAfter);
  });
});