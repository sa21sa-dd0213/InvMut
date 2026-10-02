import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mca8ea561 by calling multiplicate with msg.value = 0 (original passes, mutant reverts)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so that address(this).balance > 0
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    await fundTx.wait();

    // Call multiplicate with msg.value = 0 (the edge case that kills the mutant)
    // In original: require(balance + 0 >= balance) passes (always true)
    // In mutant:   require(balance + 0 > balance) fails (false when msg.value = 0)
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 0 })
    ).to.not.be.reverted;
  });
});