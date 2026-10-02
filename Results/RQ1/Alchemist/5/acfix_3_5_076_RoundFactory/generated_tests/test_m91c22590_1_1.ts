import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory - kill mutant m91c22590", function () {
  it("should emit RoundImplementationUpdated event when updateRoundImplementation is called", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed since it uses initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // First, add owner as program operator to be able to call create
    await instance.connect(owner).updateRoundImplementation(addr1.address);

    // Now test the event emission by calling updateRoundImplementation again
    // The event should be emitted with the new implementation address
    const newImplementation = addr1.address;

    await expect(instance.connect(owner).updateRoundImplementation(newImplementation))
      .to.emit(instance, "RoundImplementationUpdated")
      .withArgs(newImplementation);
  });
});