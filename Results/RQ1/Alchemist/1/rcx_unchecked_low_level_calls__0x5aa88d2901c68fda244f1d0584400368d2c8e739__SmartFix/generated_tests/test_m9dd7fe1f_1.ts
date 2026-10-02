import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should detect mutant by calling multiplicate with msg.value=0 when contract has balance", async function () {
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

    // Call multiplicate with msg.value = 0 - this should succeed in original but fail in mutant
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: 0 })
    ).to.not.be.reverted;
  });
});