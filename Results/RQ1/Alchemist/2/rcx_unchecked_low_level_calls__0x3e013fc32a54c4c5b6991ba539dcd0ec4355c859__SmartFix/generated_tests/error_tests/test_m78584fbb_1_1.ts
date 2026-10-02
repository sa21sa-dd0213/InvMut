import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m78584fbb by calling multiplicate with msg.value = 0 and expecting revert due to underflow", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first so the condition msg.value >= address(this).balance can be false
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Call multiplicate with 0 wei - this will pass on original but revert on mutant due to msg.value-1 underflow
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: 0 })
    ).to.be.reverted;
  });
});