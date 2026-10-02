import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m465f4040 test", function () {
  it("should revert when calling create from non-program operator address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize();
    
    // addr1 is not a program operator, so calling create should revert
    const encodedParameters = "0x";
    await expect(
      instance.connect(addr1).create(encodedParameters, addr2.address)
    ).to.be.revertedWith("Caller is not a program operator");
  });
});