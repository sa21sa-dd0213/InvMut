import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m2a879f35 detection", function () {
  it("should kill the mutant by sending exactly 10 ether and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Send exactly 10 ether to the fallback function
    const tx = await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });

    // Wait for the transaction to be mined
    await tx.wait();

    // The mutant would revert with != 10 ether, so if tx succeeded, mutant is killed
    // (Original accepts exactly 10 ether, mutant rejects it)
    expect(true).to.be.true; // If we reached here, the tx did not revert - mutant is killed
  });
});