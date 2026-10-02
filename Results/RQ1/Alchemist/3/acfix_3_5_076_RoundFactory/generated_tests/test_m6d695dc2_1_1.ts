import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m6d695dc2 test", function () {
  it("should emit RoundCreated event when create is called", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the factory
    await instance.initialize();

    // Deploy a minimal mock round implementation contract
    const RoundImpl = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await RoundImpl.deploy();
    await roundImpl.waitForDeployment();

    // Set the round implementation and alloSettings
    await instance.updateRoundImplementation(await roundImpl.getAddress());
    const mockAlloSettings = await (await ethers.getContractFactory("AlloSettings")).deploy();
    await mockAlloSettings.waitForDeployment();
    await instance.updateAlloSettings(await mockAlloSettings.getAddress());

    // Add addr1 as a program operator
    await instance.connect(owner).setProgramOperator(addr1.address, true);

    // Prepare encoded parameters (empty bytes for simplicity)
    const encodedParameters = ethers.toUtf8Bytes("");

    // Get the expected clone address by calling staticCall first
    const expectedCloneAddress = await instance.connect(addr1).create.staticCall(encodedParameters, addr2.address);

    // Call create from program operator and expect RoundCreated event
    await expect(
      instance.connect(addr1).create(encodedParameters, addr2.address)
    )
      .to.emit(instance, "RoundCreated")
      .withArgs(
        expectedCloneAddress,
        addr2.address,
        await roundImpl.getAddress()
      );
  });
});