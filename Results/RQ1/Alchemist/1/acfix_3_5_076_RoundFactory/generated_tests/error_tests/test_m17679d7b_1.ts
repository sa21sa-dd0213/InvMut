import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - updateAlloSettings", function () {
  it("should detect mutant that sets alloSettings to address(this) instead of newAlloSettings", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed based on the contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Deploy a mock RoundImplementation to use for creating rounds
    // We need a simple contract that implements IRoundImplementation
    const RoundImplementationFactory = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await RoundImplementationFactory.deploy();
    await roundImpl.waitForDeployment();
    
    // Update round implementation
    await instance.updateRoundImplementation(roundImpl.target);
    
    // Set a specific AlloSettings address (different from RoundFactory address)
    const testAlloSettings = addr1.address;
    await instance.updateAlloSettings(testAlloSettings);
    
    // Verify alloSettings was set correctly
    const storedAlloSettings = await instance.alloSettings();
    expect(storedAlloSettings).to.equal(testAlloSettings);
    
    // Add addr2 as a program operator
    await instance.programOperators(addr2.address, true);
    
    // Create encoded parameters for round initialization
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"],
      [owner.address, addr1.address]
    );
    
    // Have program operator create a round
    const createTx = await instance.connect(addr2).create(encodedParameters, owner.address);
    const receipt = await createTx.wait();
    
    // Get the created round address from the event
    const event = receipt.logs.find(
      (log: any) => log.fragment?.name === "RoundCreated"
    );
    expect(event).to.not.be.undefined;
    
    // Verify the round was initialized with the correct AlloSettings
    // If the mutant is present, the round would have been initialized with address(this) instead
    const roundAddress = event.args.roundAddress;
    const roundContract = await ethers.getContractAt("IRoundImplementation", roundAddress);
    
    // Check that alloSettings in the round matches the one we set, not the factory address
    const roundAlloSettings = await roundContract.alloSettings();
    expect(roundAlloSettings).to.equal(testAlloSettings);
    expect(roundAlloSettings).to.not.equal(instance.target);
  });
});