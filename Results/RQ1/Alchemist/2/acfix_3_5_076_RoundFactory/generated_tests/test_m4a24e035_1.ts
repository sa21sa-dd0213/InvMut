import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m4a24e035 - onlyOwner modifier removal", function () {
  it("should revert when non-owner calls updateRoundImplementation", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments as it uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract as owner
    await instance.connect(owner).initialize();
    
    // Attempt to call updateRoundImplementation from non-owner address
    const newImplementation = "0x0000000000000000000000000000000000000001";
    
    await expect(
      instance.connect(nonOwner).updateRoundImplementation(newImplementation)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});