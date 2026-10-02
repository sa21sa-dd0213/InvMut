import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m8ceb490f", function () {
  it("should revert when owner calls withdrawAll due to inverted require condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ether to the contract so there's a balance to withdraw
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner tries to withdraw - should revert in mutant because require(msg.sender!=owner) fails
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});