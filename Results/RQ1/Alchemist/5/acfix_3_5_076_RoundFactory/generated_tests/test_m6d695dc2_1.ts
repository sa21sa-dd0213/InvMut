import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory - kill mutant m6d695dc2 (event emission removed)", function () {
  it("should emit RoundCreated event when create is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up program operator
    await instance.connect(owner).updateAlloSettings(addr1.address);
    
    // Deploy a minimal proxy implementation contract for roundImplementation
    // We need a simple contract that implements IRoundImplementation
    const MinimalProxy = await ethers.getContractFactory("MinimalProxy");
    const roundImpl = await MinimalProxy.deploy();
    await roundImpl.waitForDeployment();
    
    // Set roundImplementation
    await instance.connect(owner).updateRoundImplementation(roundImpl.target);
    
    // Add owner as program operator
    // Note: The contract has programOperators mapping, we need to set it
    // Since there's no addProgramOperator function, we'll need to directly set the mapping
    // Using storage manipulation or deploy a test helper
    // For this test, let's assume we can set the program operator via the contract's storage
    // Actually, the contract doesn't have a setter for programOperators, so we'll use a workaround
    // Let's deploy a test version that exposes this
    const TestFactory = await ethers.getContractFactory("RoundFactory");
    const testInstance = await TestFactory.deploy();
    await testInstance.waitForDeployment();
    await testInstance.initialize();
    
    // Set program operator by directly calling the storage slot
    // In ethers v6, we can use the provider to set storage
    // But it's easier to create a minimal test helper contract
    // For now, let's use a different approach - deploy a modified factory that allows setting program operators
    
    // Actually, the simplest approach: create a minimal test that doesn't require program operator
    // Since the original contract requires onlyProgramOperator modifier, we need to set it
    // Let's use ethers to set the storage slot directly
    const slot = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [owner.address, 0]));
    await ethers.provider.send("hardhat_setStorageAt", [
      testInstance.target,
      slot,
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    ]);
    
    // Now call create and expect event emission
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [owner.address, 123]
    );
    
    // We need to handle the fact that the cloned contract will call initialize on itself
    // For testing event emission, we just need the transaction to succeed and emit the event
    const tx = await testInstance.connect(owner).create(encodedParams, addr2.address);
    const receipt = await tx.wait();
    
    // Check for RoundCreated event
    const event = receipt.logs.find(
      (log) => log.topics[0] === ethers.id("RoundCreated(address,address,address)")
    );
    
    expect(event).to.not.be.undefined;
    
    // Decode the event to verify parameters
    const iface = new ethers.Interface([
      "event RoundCreated(address indexed roundAddress, address indexed ownedBy, address indexed roundImplementation)"
    ]);
    const decodedEvent = iface.parseLog({
      topics: event.topics,
      data: event.data
    });
    
    expect(decodedEvent.args.ownedBy).to.equal(addr2.address);
    expect(decodedEvent.args.roundImplementation).to.equal(roundImpl.target);
  });
});