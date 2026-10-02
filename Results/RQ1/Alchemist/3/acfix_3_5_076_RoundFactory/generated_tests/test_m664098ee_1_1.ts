import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - m664098ee", function () {
  it("should detect mutant that sets roundImplementation to address(this) instead of the provided parameter", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed - uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Initialize the contract
    await factory.initialize();

    // Deploy a mock implementation to use as the round implementation
    const MockImpl = await ethers.getContractFactory("RoundImplementation");
    const mockImpl = await MockImpl.deploy();
    await mockImpl.waitForDeployment();

    // Set up program operator role
    await factory.connect(owner).updateProgramOperator(owner.address, true);

    // Update round implementation with the mock implementation address
    const tx = await factory.connect(owner).updateRoundImplementation(mockImpl.target);
    await tx.wait();

    // Verify the roundImplementation was set correctly (original behavior)
    // The mutant would set it to address(this) instead
    const storedImpl = await factory.roundImplementation();

    // In the original: storedImpl should equal mockImpl.target
    // In the mutant: storedImpl would equal factory.target (address of the factory itself)
    expect(storedImpl).to.equal(mockImpl.target,
      "Mutant detected: roundImplementation was set to factory address instead of the provided implementation");

    // Additional verification: try to create a round and verify it works
    // Encode parameters for round initialization
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256"],
      [owner.address, ethers.ZeroAddress, 0, 0]
    );

    // This call would revert with the mutant because cloning address(this) would fail
    // or produce unexpected behavior when initializing
    await expect(
      factory.connect(owner).create(encodedParams, owner.address)
    ).to.not.be.reverted;
  });
});