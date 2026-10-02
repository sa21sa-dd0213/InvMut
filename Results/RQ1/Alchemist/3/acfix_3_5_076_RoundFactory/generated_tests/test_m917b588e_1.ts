import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m917b588e - updateRoundImplementation", function () {
  it("should kill mutant by calling updateRoundImplementation with a valid non-zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy RoundFactory (no constructor arguments needed as per contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required by OwnableUpgradeable pattern)
    await instance.initialize();
    
    // Deploy a dummy contract to use as a valid round implementation address
    const Dummy = await ethers.getContractFactory("DummyContract");
    const dummy = await Dummy.deploy();
    await dummy.waitForDeployment();
    
    // The mutant changes require(newRoundImplementation != address(0)) to require(newRoundImplementation == address(0))
    // So passing a valid non-zero address should revert in the mutant, but succeed in the original
    // Therefore, this test expects success (no revert) - which will fail on the mutant (killing it)
    await expect(
      instance.updateRoundImplementation(await dummy.getAddress())
    ).to.not.be.reverted;
    
    // Verify the state was updated
    expect(await instance.roundImplementation()).to.equal(await dummy.getAddress());
  });
});

// Minimal dummy contract to create a valid non-zero address
contract DummyContract {
  // Empty contract, just needs to exist at an address
}