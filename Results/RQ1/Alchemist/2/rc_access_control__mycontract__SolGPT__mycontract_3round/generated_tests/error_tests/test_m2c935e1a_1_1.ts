import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6)", function () {
  it("should allow owner to send ether and detect mutant where require(msg.sender != owner) blocks owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether for the transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls sendTo - should succeed on original but revert on mutant
    await expect(
      instance.connect(owner).sendTo(addr1.address, ethers.parseEther("0.5"))
    ).to.not.be.reverted;
  });
});