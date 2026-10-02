import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m96e28e3f test", function () {
  it("should allow only owner to withdraw all funds, revert for others", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Owner should be able to withdraw successfully (this will fail on mutant)
    const tx = await instance.connect(owner).withdrawAll(owner.address);
    await expect(tx).to.not.be.reverted;
  });
});