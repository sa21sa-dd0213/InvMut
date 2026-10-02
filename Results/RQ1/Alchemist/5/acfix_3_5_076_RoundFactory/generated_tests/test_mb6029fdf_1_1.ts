import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant kill test - updateAlloSettings", function () {
  it("should detect mutant that always sets alloSettings to address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as it uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Add owner as a program operator
    await instance.connect(owner).setProgramOperator(owner.address, true);
    
    // Deploy a mock round implementation that tracks the alloSettings address
    const MockRound = await ethers.getContractFactory("MockRoundImplementation");
    const mockRound = await MockRound.deploy();
    await mockRound.waitForDeployment();
    
    // Set the round implementation
    await instance.connect(owner).updateRoundImplementation(mockRound.target);
    
    // Call updateAlloSettings with a valid non-zero address
    const validSettings = "0x0000000000000000000000000000000000000001";
    await instance.connect(owner).updateAlloSettings(validSettings);
    
    // Prepare encoded parameters for create
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [owner.address, 100]
    );
    
    // Call create - this should fail with the mutant because alloSettings will be address(0)
    // In the original contract, create would succeed and pass validSettings to initialize
    // In the mutant, create will pass address(0) to initialize, causing it to revert
    await expect(
      instance.connect(owner).create(encodedParams, addr1.address)
    ).to.be.reverted;
    
    // Additional check: verify alloSettings is still the valid address (original behavior)
    // This should pass for original but fail for mutant where alloSettings is now address(0)
    expect(await instance.alloSettings()).to.equal(validSettings);
  });
});