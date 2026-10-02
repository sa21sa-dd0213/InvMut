import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m6d695dc2 test", function () {
  it("should emit RoundCreated event when create is called", async function () {
    const [owner, programOperator, ownedBy] = await ethers.getSigners();

    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Initialize the factory
    await factory.initialize();

    // Set program operator
    await factory.connect(owner).updateProgramOperator(programOperator.address, true);

    // Deploy a mock round implementation
    const RoundImplementation = await ethers.getContractFactory("RoundImplementation");
    const roundImplementation = await RoundImplementation.deploy();
    await roundImplementation.waitForDeployment();

    // Set round implementation
    await factory.connect(owner).updateRoundImplementation(roundImplementation.target);

    // Set alloSettings
    await factory.connect(owner).updateAlloSettings(programOperator.address);

    // Prepare encoded parameters
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"],
      [owner.address, ownedBy.address]
    );

    // Call create and check for event emission
    const tx = await factory.connect(programOperator).create(encodedParameters, ownedBy.address);
    const receipt = await tx.wait();

    // Verify event was emitted
    const event = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id("RoundCreated(address,address,address)")
    );

    expect(event).to.not.be.undefined;

    // Verify event parameters
    const decodedEvent = new ethers.Interface([
      "event RoundCreated(address indexed roundAddress, address indexed ownedBy, address indexed roundImplementation)"
    ]).parseLog(event);

    expect(decodedEvent.args.ownedBy).to.equal(ownedBy.address);
    expect(decodedEvent.args.roundImplementation).to.equal(roundImplementation.target);
  });
});