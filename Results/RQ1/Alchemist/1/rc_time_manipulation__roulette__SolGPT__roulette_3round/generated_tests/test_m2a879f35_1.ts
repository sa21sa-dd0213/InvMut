import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m2a879f35 test", function () {
  it("should kill mutant by sending exactly 10 ether and expecting success (no revert)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the contract
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Verify the transaction succeeded (mutant would revert because 10 == 10, so != fails)
    // No revert expected - if revert occurs, test fails (kills mutant)
    expect(true).to.be.true; // Simple assertion to confirm execution reached here
  });
});