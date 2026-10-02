import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m41fe0e10 - remove alloSettings zero check", function () {
  it("should revert when creating a round with alloSettings set to zero address", async function () {
    const [owner, programOperator, roundOwner] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed - uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set up program operator
    await instance.connect(owner).updateRoundImplementation(owner.address);
    await instance.connect(owner).updateAlloSettings(ethers.ZeroAddress);
    
    // Add program operator
    await instance.connect(owner).addProgramOperator(programOperator.address);
    
    // Attempt to create a round with alloSettings = zero address
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [roundOwner.address, 100]
    );
    
    // Original contract should revert due to alloSettings check
    // Mutant would not revert (missing require statement)
    await expect(
      instance.connect(programOperator).create(encodedParams, roundOwner.address)
    ).to.be.revertedWith("alloSettings is 0x");
  });
});