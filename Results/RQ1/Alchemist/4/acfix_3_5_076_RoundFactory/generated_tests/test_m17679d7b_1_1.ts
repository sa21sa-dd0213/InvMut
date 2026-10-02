import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - updateAlloSettings", function () {
  it("should detect mutant that sets alloSettings to address(this) instead of provided address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Deploy a mock contract to serve as roundImplementation
    // We need a simple contract that implements IRoundImplementation
    const MockRound = await ethers.getContractFactory("MockRoundImplementation");
    const mockRound = await MockRound.deploy();
    await mockRound.waitForDeployment();
    
    // Deploy a mock AlloSettings contract
    const MockAlloSettings = await ethers.getContractFactory("MockAlloSettings");
    const mockAlloSettings = await MockAlloSettings.deploy();
    await mockAlloSettings.waitForDeployment();
    
    // Add owner as program operator
    await instance.addProgramOperator(owner.address);
    
    // Set round implementation
    await instance.updateRoundImplementation(mockRound.target);
    
    // Set alloSettings to a different address (not the factory itself)
    const externalAlloSettingsAddress = mockAlloSettings.target;
    await instance.updateAlloSettings(externalAlloSettingsAddress);
    
    // Verify alloSettings was set correctly
    const storedAlloSettings = await instance.alloSettings();
    expect(storedAlloSettings).to.equal(externalAlloSettingsAddress);
    
    // Now create a round
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"],
      [addr1.address, addr2.address]
    );
    
    const tx = await instance.create(encodedParameters, addr1.address);
    const receipt = await tx.wait();
    
    // Get the created round address from event
    const event = receipt.logs.find(
      (log) => log.topics[0] === ethers.id("RoundCreated(address,address,address)")
    );
    expect(event).to.not.be.undefined;
    
    const roundAddress = ethers.getAddress(ethers.dataSlice(event.topics[1], 12));
    
    // Check that the round's initialize was called with correct alloSettings
    // The round should have stored the alloSettings address we provided
    const roundContract = await ethers.getContractAt("MockRoundImplementation", roundAddress);
    const roundAlloSettings = await roundContract.alloSettings();
    
    // In the original contract, alloSettings should be the external address we set
    // In the mutant, it would be the factory address (address(this))
    expect(roundAlloSettings).to.equal(externalAlloSettingsAddress);
    expect(roundAlloSettings).to.not.equal(instance.target);
  });
});