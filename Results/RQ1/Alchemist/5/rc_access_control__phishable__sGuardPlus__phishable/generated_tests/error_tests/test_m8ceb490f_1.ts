import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Phishable mutant test", function () {
  it("should kill mutant m8ceb490f by calling withdrawAll from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls withdrawAll - should succeed on original, revert on mutant
    const tx = await instance.connect(owner).withdrawAll(owner.address);
    await tx.wait();

    // Verify the contract balance is now 0
    const balance = await ethers.provider.getBalance(await instance.getAddress());
    expect(balance).to.equal(0);
  });
});