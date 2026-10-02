import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection", function () {
  it("should revert when non-owner calls withdrawAll after mutant removes require check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether so the call can attempt a transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt withdrawAll from non-owner - should revert because mutant removed require(msg.sender==owner)
    await expect(
      instance.connect(addr1).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});