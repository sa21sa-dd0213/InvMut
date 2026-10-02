import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m4a24e035 - updateRoundImplementation access control", function () {
  it("should revert when non-owner calls updateRoundImplementation (onlyOwner modifier removed in mutant)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    
    // Deploy the RoundFactory contract (no constructor arguments needed - it uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable)
    await instance.connect(owner).initialize();
    
    // Get a random address to use as new implementation (non-zero address)
    const newImplementation = ethers.Wallet.createRandom().address;
    
    // Attempt to call updateRoundImplementation from a non-owner address
    // Original contract reverts with "Ownable: caller is not the owner"
    // Mutant removed onlyOwner modifier, so this will succeed (killing the mutant)
    await expect(
      instance.connect(nonOwner).updateRoundImplementation(newImplementation)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});