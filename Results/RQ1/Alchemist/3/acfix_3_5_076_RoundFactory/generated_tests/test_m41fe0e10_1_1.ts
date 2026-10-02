import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory - kill mutant m41fe0e10", function () {
  it("should revert when create is called with alloSettings not set (address(0))", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy RoundFactory - no constructor arguments needed (uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required by OwnableUpgradeable)
    await instance.initialize();

    // Set up a round implementation address (must be a contract for clone to work)
    const DummyImpl = await ethers.getContractFactory("RoundFactory");
    const dummyImpl = await DummyImpl.deploy();
    await dummyImpl.waitForDeployment();

    // Update round implementation to a valid contract address
    await instance.updateRoundImplementation(await dummyImpl.getAddress());

    // Get the storage slot for programOperators[owner.address]
    // The mapping is at storage slot 3 (after _owner at 0, _initialized/_initializing at 1, __gap_1 at 2)
    const slot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [await owner.getAddress(), 3]
      )
    );

    // Set programOperators[owner.address] = true via storage
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    ]);

    // Verify owner is now a program operator
    expect(await instance.programOperators(await owner.getAddress())).to.be.true;

    // Now call create with alloSettings still at address(0)
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [await owner.getAddress(), 123]
    );

    // In the original contract, this should revert with "alloSettings is 0x"
    // In the mutant (m41fe0e10), the require is removed, so it will proceed
    // and likely fail at a different point (clone creation or initialize)
    await expect(
      instance.create(encodedParams, await addr1.getAddress())
    ).to.be.reverted;
  });
});