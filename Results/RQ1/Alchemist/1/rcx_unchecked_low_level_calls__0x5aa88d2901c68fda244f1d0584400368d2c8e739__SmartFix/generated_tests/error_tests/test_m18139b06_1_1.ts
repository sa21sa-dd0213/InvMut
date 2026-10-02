import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m18139b06: owner should be able to withdraw, mutant reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Owner calls withdraw - should succeed in original, revert in mutant
    const withdrawTx = instance.connect(owner).withdraw();

    // This assertion will pass on original (owner can withdraw) but fail on mutant (revert)
    await expect(withdrawTx).to.not.be.reverted;
  });
});