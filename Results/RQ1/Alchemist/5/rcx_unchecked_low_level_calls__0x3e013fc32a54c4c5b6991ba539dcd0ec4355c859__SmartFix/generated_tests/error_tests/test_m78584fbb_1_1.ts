import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
  it("should kill mutant m78584fbb by calling multiplicate with msg.value = 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ether to the contract first so it has a balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Call multiplicate with msg.value = 0 - should succeed in original, revert in mutant
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 0 })
    ).to.not.be.reverted;
  });
});