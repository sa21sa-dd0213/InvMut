import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant mb6029fdf test", function () {
  it("should detect that updateAlloSettings always sets alloSettings to address(0) instead of the provided address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable)
    await (await instance.initialize()).wait();
    
    // Set up a program operator for the create function
    await (await instance.connect(owner).updateProgramOperator(addr1.address, true)).wait();
    
    // Set a valid round implementation first (required by create)
    const roundImplementationAddress = addr1.address; // Using addr1 as placeholder round implementation
    await (await instance.connect(owner).updateRoundImplementation(roundImplementationAddress)).wait();
    
    // Call updateAlloSettings with a valid non-zero address
    const validAlloSettings = addr2.address;
    await (await instance.connect(owner).updateAlloSettings(validAlloSettings)).wait();
    
    // Now try to call create - this should succeed on original but fail on mutant
    // because mutant sets alloSettings to address(0)
    const encodedParameters = ethers.hexlify(ethers.toUtf8Bytes("test"));
    
    await expect(
      instance.connect(addr1).create(encodedParameters, owner.address)
    ).to.be.revertedWith("alloSettings is 0x");
  });
});