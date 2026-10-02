import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
  it("should detect mutant m1de27864 by reverting when msg.value > 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Call multiplicate with a non-zero value
    // Original: require((balance + msg.value) >= balance) always passes
    // Mutant: require((balance + msg.value) <= balance) will fail when msg.value > 0
    await expect(
      instance.connect(owner).multiplicate(addr1.address, {
        value: ethers.parseEther("5")
      })
    ).to.be.reverted;
  });
});