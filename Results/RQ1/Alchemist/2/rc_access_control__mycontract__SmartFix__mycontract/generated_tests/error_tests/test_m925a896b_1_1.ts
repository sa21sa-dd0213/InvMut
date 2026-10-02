import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract - kill mutant m925a896b", function () {
  it("should revert when sending to address zero (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund contract with some Ether to enable transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to send to zero address - should revert on original
    await expect(
      instance.connect(owner).sendTo(
        ethers.ZeroAddress,
        ethers.parseEther("0.1")
      )
    ).to.be.reverted;
  });
});