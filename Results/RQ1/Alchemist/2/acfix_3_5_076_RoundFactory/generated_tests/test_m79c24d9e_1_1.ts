import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m79c24d9e test", function () {
  it("should kill mutant by verifying updateRoundImplementation correctly stores the new implementation", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed as per the contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required by Initializable pattern)
    await (await instance.initialize()).wait();

    // Deploy a mock implementation contract to use as newRoundImplementation
    // Note: IRoundImplementation is an interface, so we need to deploy a contract that implements it
    const MockImplementation = await ethers.getContractFactory("MockRoundImplementation");
    const mockImpl = await MockImplementation.deploy();
    await mockImpl.waitForDeployment();

    // Grant program operator role to owner for the create function test
    // The contract has a mapping, but no explicit setter, so we need to use storage manipulation
    // Since the mapping is public, we can set it via storage slot manipulation
    // The mapping is at storage slot 0 (after OwnableUpgradeable's __gap variables)
    // Actually, we need to use a different approach - let's use storage layout knowledge
    // RoundFactory inherits OwnableUpgradeable which has:
    //   - _owner (slot 0)
    //   - __gap_2 (49 slots) -> slots 1-49
    // Then RoundFactory has:
    //   - roundImplementation (slot 50)
    //   - alloSettings (slot 51)
    //   - programOperators (slot 52)
    // But actually, Initializable has _initialized and _initializing at slots 0-1
    // Let's use ethers to set the storage slot directly
    const slot = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [owner.address, 52])
    );
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    ]);

    // Call updateRoundImplementation with a valid address
    const newImplAddress = await mockImpl.getAddress();
    await (await instance.updateRoundImplementation(newImplAddress)).wait();

    // Verify that roundImplementation was set correctly (not to address(0))
    const storedImpl = await instance.roundImplementation();
    expect(storedImpl).to.equal(newImplAddress);

    // Now try to create a round - this should fail on mutant because
    // mutant sets roundImplementation to address(0)
    // On original, this should succeed
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"],
      [owner.address, addr1.address]
    );

    // This call will revert on mutant because roundImplementation is address(0)
    // On original it should succeed
    await expect(
      instance.create(encodedParams, owner.address)
    ).to.not.be.reverted;
  });
});