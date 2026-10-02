import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - alloSettings zero address check", function () {
  it("should revert when creating a round with alloSettings set to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as it uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // Set the caller as a program operator
    // Note: programOperators mapping needs to be set - we need to find how to set it
    // Since there's no setProgramOperator function, we need to check the contract
    // The contract has a public mapping programOperators, but no setter function
    // For testing purposes, we'll need to interact with the storage directly or use a different approach
    
    // Actually, looking at the contract more carefully, there's no function to add program operators
    // The onlyProgramOperator modifier requires programOperators[msg.sender] to be true
    // Since we can't set it through public functions, we'll test the require statement directly
    
    // Deploy a mock round implementation
    const RoundImplementation = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await RoundImplementation.deploy();
    await roundImpl.waitForDeployment();
    
    // Set round implementation
    await instance.updateRoundImplementation(await roundImpl.getAddress());
    
    // Try to create a round with alloSettings = address(0) (default value)
    // This should revert with "alloSettings is 0x" in the original
    // But the mutant removed this check
    
    // Since we can't set programOperators, we need to test the alloSettings check directly
    // by calling the create function through a different path
    
    // Alternative approach: test the require statement by calling the function directly
    // with a program operator that we set via storage manipulation
    
    // For Hardhat, we can use storage manipulation to set the program operator
    const slot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [owner.address, 0] // slot 0 for first mapping slot
      )
    );
    
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    ]);
    
    // Now owner should be a program operator
    // With alloSettings still at address(0), the original would revert
    // The mutant would not revert
    
    // Set encoded parameters (dummy data)
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [owner.address, 100]
    );
    
    // This should revert in the original but might pass in the mutant
    await expect(
      instance.create(encodedParameters, owner.address)
    ).to.be.revertedWith("alloSettings is 0x");
  });
});