import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection test", function () {
  it("should detect mutant m2a879f35 by sending exactly 10 ether and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the contract via fallback
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Verify that the transaction succeeded (no revert)
    // The original contract accepts exactly 10 ether, mutant rejects it
    // If the mutant is deployed, this transaction would revert
    // We can also verify the contract state updated
    const pastBlockTime = await instance.pastBlockTime();
    expect(pastBlockTime).to.not.equal(0);
  });
});