import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - Kill mutant mca8ea561", function () {
  it("should revert when calling multiplicate with msg.value = 0 due to >= vs > change", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first so the balance is non-zero
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Now call multiplicate with msg.value = 0
    // In original: require(balance + 0 >= balance) passes (equality case)
    // In mutant: require(balance + 0 > balance) fails (reverts)
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 0 })
    ).to.be.reverted;
  });
});