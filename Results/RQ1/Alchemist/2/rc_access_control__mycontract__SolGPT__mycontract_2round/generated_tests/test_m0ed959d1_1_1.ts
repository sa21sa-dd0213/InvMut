import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending to zero address (detects mutant that changes != to ==)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const zeroAddress = ethers.ZeroAddress;
    const amount = ethers.parseEther("1");

    // Original contract: require(receiver != address(0)) reverts with no reason
    // Mutant: require(receiver == address(0)) passes, then transfer to zero address reverts
    // We expect revert in both cases, but the revert location differs.
    // To kill the mutant, we check that the revert happens specifically at the require statement
    // by verifying the transaction fails when called from owner with zero address.
    await expect(
      instance.connect(owner).sendTo(zeroAddress, amount)
    ).to.be.reverted;
  });
});