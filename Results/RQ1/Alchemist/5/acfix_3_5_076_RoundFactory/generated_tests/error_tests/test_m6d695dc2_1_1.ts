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

    // Set up program operator by directly setting the storage slot
    // The programOperators mapping slot is computed as keccak256(abi.encode(address, uint256))
    // where uint256 is the mapping slot number (which is 0 for the first mapping after __gap)
    // But we need to calculate the correct slot. The mapping is declared after __gap variables
    // which occupy 50 slots for ContextUpgradeable and 49 slots for OwnableUpgradeable
    // So programOperators is at slot 2 (0: _initialized, 1: _initializing, 2: programOperators)
    // Actually, let's just compute it properly:
    // The mapping slot is the position where it's declared in storage
    // After OwnableUpgradeable's __gap_2 (49 slots), the next slot is for programOperators
    // So the slot is 2 (0: _initialized, 1: _initializing, 2: programOperators)
    const slot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [owner.address, 2]
      )
    );
    
    await ethers.provider.send("hardhat_setStorageAt", [
      instance.target,
      slot,
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    ]);

    // Set roundImplementation
    // We need a minimal proxy that implements IRoundImplementation
    // Deploy a simple contract that can be cloned
    const MinimalProxy = await ethers.getContractFactory("MinimalProxy");
    const roundImpl = await MinimalProxy.deploy();
    await roundImpl.waitForDeployment();
    
    await instance.connect(owner).updateRoundImplementation(roundImpl.target);

    // Set alloSettings
    await instance.connect(owner).updateAlloSettings(addr1.address);

    // Now call create and expect event emission
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [owner.address, 123]
    );

    const tx = await instance.connect(owner).create(encodedParams, addr2.address);
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