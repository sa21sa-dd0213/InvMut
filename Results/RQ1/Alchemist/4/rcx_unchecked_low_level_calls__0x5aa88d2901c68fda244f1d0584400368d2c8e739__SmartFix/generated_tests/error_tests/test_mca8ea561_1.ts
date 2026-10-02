import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should kill mutant mca8ea561 by calling multiplicate with zero ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first so the condition can be evaluated
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Call multiplicate with zero msg.value - original allows it, mutant reverts
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 0 })
    ).to.not.be.reverted;
  });
});