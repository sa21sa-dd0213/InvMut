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

    // Deploy a mock round implementation
    const RoundImplementation = await ethers.getContractFactory("RoundImplementation");
    const roundImpl = await RoundImplementation.deploy();
    await roundImpl.waitForDeployment();

    // Set round implementation
    await instance.updateRoundImplementation(await roundImpl.getAddress());

    // Set the caller as a program operator via storage manipulation
    // The programOperators mapping is at slot 0 (first state variable after initialization)
    // For mapping(address => bool), the slot for a key is keccak256(abi.encode(key, slot))
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

    // Set encoded parameters (dummy data)
    const encodedParameters = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [owner.address, 100]
    );

    // This should revert because alloSettings is address(0)
    await expect(
      instance.create(encodedParameters, owner.address)
    ).to.be.revertedWith("alloSettings is 0x");
  });
});