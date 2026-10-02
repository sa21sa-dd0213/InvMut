import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m4588ed43 - missing return statement", function () {
  it("should return the clone address from create() - mutant without return would return address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable)
    await instance.initialize();
    
    // Deploy a mock implementation contract that the factory will clone
    const RoundImplementation = await ethers.getContractFactory("RoundImplementation");
    const implementation = await RoundImplementation.deploy();
    await implementation.waitForDeployment();
    
    // Deploy a mock AlloSettings contract
    const AlloSettings = await ethers.getContractFactory("AlloSettings");
    const alloSettings = await AlloSettings.deploy();
    await alloSettings.waitForDeployment();
    
    // Set up the factory with implementation and alloSettings
    await instance.updateRoundImplementation(await implementation.getAddress());
    await instance.updateAlloSettings(await alloSettings.getAddress());
    
    // Add owner as a program operator
    await instance.addProgramOperator(owner.address);
    
    // Prepare encoded parameters for the clone initialization
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [owner.address, 1000]
    );
    
    // Call create() and capture the return value
    const tx = await instance.connect(owner).create(encodedParameters, owner.address);
    const receipt = await tx.wait();
    
    // Get the event logs to find the clone address emitted
    const event = receipt.logs.find(
      (log) => log.topics[0] === ethers.id("RoundCreated(address,address,address)")
    );
    
    // Decode the event to get the actual clone address
    const iface = new ethers.Interface([
      "event RoundCreated(address indexed roundAddress, address indexed ownedBy, address indexed roundImplementation)"
    ]);
    const decodedEvent = iface.parseLog({
      topics: event.topics,
      data: event.data
    });
    
    // Get the return value from the transaction
    const returnValue = await instance.create.staticCall(encodedParameters, owner.address);
    
    // The return value should be the clone address, not address(0)
    // The mutant would return address(0) since it removes the return statement
    expect(returnValue).to.not.equal(ethers.ZeroAddress);
    expect(returnValue).to.equal(decodedEvent.args.roundAddress);
  });
});