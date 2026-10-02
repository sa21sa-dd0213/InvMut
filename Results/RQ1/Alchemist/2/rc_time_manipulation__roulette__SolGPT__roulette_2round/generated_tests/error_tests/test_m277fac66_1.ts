import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m277fac66", function () {
  it("should kill mutant by sending exactly 10 ether and expecting success, but mutant requires 11 ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the fallback function
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Wait for the transaction to be mined
    await tx.wait();

    // In the original contract, this should succeed (no revert)
    // In the mutant, require(msg.value-1 == 10 ether) means require(msg.value == 11 ether),
    // so sending 10 ether will revert. We expect the transaction to succeed,
    // which will kill the mutant because it reverts instead.
    // Check that pastBlockTime was updated as proof the require passed
    const pastBlockTime = await instance.pastBlockTime();
    expect(pastBlockTime).to.be.gt(0);
  });
});