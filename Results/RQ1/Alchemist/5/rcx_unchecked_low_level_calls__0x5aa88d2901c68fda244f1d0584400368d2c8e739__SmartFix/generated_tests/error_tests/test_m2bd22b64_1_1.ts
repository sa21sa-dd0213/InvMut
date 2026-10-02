import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant m2bd22b64", function () {
  it("should revert when msg.value is less than contract balance in multiplicate", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call multiplicate with msg.value less than contract balance
    // This should revert in the original due to the require statement
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, {
        value: ethers.parseEther("0.5")
      })
    ).to.be.reverted;
  });
});