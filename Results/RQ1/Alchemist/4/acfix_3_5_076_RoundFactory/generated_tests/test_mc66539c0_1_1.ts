import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant test - mc66539c0", function () {
  it("should revert when creating a round with roundImplementation set to zero address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed as it's upgradeable)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // Set roundImplementation to zero address to trigger the require check
    // This should revert because updateRoundImplementation requires non-zero address
    await expect(
      instance.connect(owner).updateRoundImplementation(ethers.ZeroAddress)
    ).to.be.revertedWith("roundImplementation is 0x");

    // Verify roundImplementation is not zero (it wasn't changed)
    expect(await instance.roundImplementation()).to.not.equal(ethers.ZeroAddress);
  });
});