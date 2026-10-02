import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m277fac66 test", function () {
  it("should kill mutant by sending exactly 10 ether and expecting success on original but revert on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to trigger fallback
    // Original requires msg.value == 10 ether (passes)
    // Mutant requires msg.value-1 == 10 ether i.e. msg.value == 11 ether (fails)
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // If we reach here without revert, the transaction succeeded
    // On the mutant this would revert because 10 ether doesn't satisfy msg.value-1 == 10 ether
    // So if the test passes, it kills the mutant (original behavior)
    expect(await ethers.provider.getBalance(await instance.getAddress())).to.equal(ethers.parseEther("10"));
  });
});