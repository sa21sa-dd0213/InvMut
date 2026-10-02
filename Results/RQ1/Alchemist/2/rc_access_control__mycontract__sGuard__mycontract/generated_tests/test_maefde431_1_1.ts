import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant maefde431 test", function () {
  it("should revert when non-owner calls sendTo after owner deploys contract", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const receiver = addr1.address;
    const amount = ethers.parseEther("0.1");

    // Owner funds the contract first so it has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner (addr1) tries to call sendTo - should revert in original
    await expect(
      instance.connect(addr1).sendTo(receiver, amount)
    ).to.be.reverted;
  });
});