import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant test for withdraw", function () {
  it("should revert when non-owner calls withdraw (detect mutant removing access control)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdraw has balance to send
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Attacker tries to call withdraw - should revert in original, pass in mutant
    await expect(
      instance.connect(attacker).withdraw()
    ).to.be.reverted;
  });
});