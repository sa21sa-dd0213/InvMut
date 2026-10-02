import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m0b8baa58 by calling multiplicate with msg.value = 0 and expecting it to succeed on original but fail on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first so that address(this).balance > 0
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Now call multiplicate with msg.value = 0
    // On original: condition (balance + 0) >= balance is true -> succeeds
    // On mutant: condition (balance + 0) > balance is false -> reverts
    await expect(
      instance.connect(owner).multiplicate(addr2.address, { value: 0 })
    ).to.be.reverted;
  });
});