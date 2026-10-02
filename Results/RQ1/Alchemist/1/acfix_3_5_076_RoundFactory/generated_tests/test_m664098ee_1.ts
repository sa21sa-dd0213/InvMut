import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m664098ee - updateRoundImplementation", function () {
  it("should use the provided implementation address when creating rounds, not the contract's own address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the RoundFactory (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Initialize the factory (required by the initializer modifier)
    await factory.initialize();
    
    // Set up a mock implementation contract and AlloSettings
    const MockImplementation = await ethers.getContractFactory("IRoundImplementation");
    const mockImpl = await MockImplementation.deploy();
    await mockImpl.waitForDeployment();
    
    const MockAlloSettings = await ethers.getContractFactory("AlloSettings");
    const mockAlloSettings = await MockAlloSettings.deploy();
    await mockAlloSettings.waitForDeployment();
    
    // Add owner as program operator
    await factory.connect(owner).addProgramOperator(owner.address);
    
    // Set the AlloSettings
    await factory.connect(owner).updateAlloSettings(await mockAlloSettings.getAddress());
    
    // Update round implementation with a specific address
    const newImplAddress = await mockImpl.getAddress();
    await factory.connect(owner).updateRoundImplementation(newImplAddress);
    
    // Verify the round implementation was set correctly
    const storedImplementation = await factory.roundImplementation();
    
    // The mutant will set roundImplementation to address(this) instead of newImplAddress
    // This assertion will fail on the mutant
    expect(storedImplementation).to.equal(newImplAddress);
    
    // Create a round and verify it uses the correct implementation
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"],
      [owner.address, addr1.address]
    );
    
    const createTx = await factory.connect(owner).create(encodedParams, addr2.address);
    const receipt = await createTx.wait();
    
    // Find the RoundCreated event to get the clone address
    const event = receipt.logs.find(
      (log: any) => log.fragment?.name === "RoundCreated"
    );
    
    if (event) {
      const cloneAddress = event.args[0];
      
      // Verify the clone's implementation is the one we set, not the factory itself
      // For a minimal proxy, the implementation is stored at slot 0
      const implementationSlot = await ethers.provider.getStorage(cloneAddress, 0);
      const actualImplementation = ethers.getAddress("0x" + implementationSlot.slice(-40));
      
      // On the mutant, this will fail because the clone was created from the factory's address
      expect(actualImplementation).to.equal(newImplAddress);
    }
  });
});