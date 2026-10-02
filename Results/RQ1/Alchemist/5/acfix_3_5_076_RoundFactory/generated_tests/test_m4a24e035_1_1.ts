import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m4a24e035 - onlyOwner modifier removal", function () {
  it("should revert when non-owner calls updateRoundImplementation (original has onlyOwner modifier)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by Initializable)
    await instance.connect(owner).initialize();
    
    // Try to call updateRoundImplementation from a non-owner address
    // In the original contract, this should revert due to onlyOwner modifier
    // In the mutant (without modifier), it would succeed
    await expect(
      instance.connect(nonOwner).updateRoundImplementation(nonOwner.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});