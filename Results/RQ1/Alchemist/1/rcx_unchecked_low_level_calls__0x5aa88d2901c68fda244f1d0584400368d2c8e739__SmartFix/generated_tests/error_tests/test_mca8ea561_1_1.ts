import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant mca8ea561 detection", function () {
  it("should detect the mutant by calling multiplicate with msg.value = 0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so that address(this).balance > 0
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Call multiplicate with msg.value = 0
    // Original contract: require((balance + 0) >= balance) passes
    // Mutant contract: require((balance + 0) > balance) fails, reverts
    const tx = instance.connect(owner).multiplicate(owner.address, { value: 0 });
    await expect(tx).to.not.be.reverted;
  });
});