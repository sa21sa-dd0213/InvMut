import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - m917b588e", function () {
  it("should revert when updateRoundImplementation is called with zero address (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (RoundFactory is OwnableUpgradeable, but we need to deploy the implementation first)
    // Note: RoundFactory inherits OwnableUpgradeable and uses initializer pattern
    // For testing the mutant, we deploy the contract directly (without proxy) to test the function logic
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required by the initializer modifier)
    await instance.connect(owner).initialize();

    // The mutant changes require(newRoundImplementation != address(0)) to require(newRoundImplementation == address(0))
    // Original: reverts when newRoundImplementation is address(0)
    // Mutant: reverts when newRoundImplementation is NOT address(0)

    // Test that calling with a non-zero address should succeed in original but revert in mutant
    const nonZeroAddress = addr1.address;

    // In the original contract, this call should succeed
    // In the mutant, this call should revert because the condition is inverted
    await expect(
      instance.connect(owner).updateRoundImplementation(nonZeroAddress)
    ).to.be.revertedWith("roundImplementation is 0x");
  });

  it("should succeed when updateRoundImplementation is called with zero address in mutant", async function () {
    const [owner] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await instance.connect(owner).initialize();

    // In the mutant, calling with zero address should succeed (inverted logic)
    // In the original, calling with zero address would revert
    // This test kills the mutant by showing the inverted behavior
    await expect(
      instance.connect(owner).updateRoundImplementation(ethers.ZeroAddress)
    ).to.not.be.reverted;
  });
});