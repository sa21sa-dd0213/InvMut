import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Phishable mutant md69ea067 test", function () {
  it("should revert when the intended owner tries to withdrawAll because owner is the contract itself", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ether to the contract so there's a balance to withdraw
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to withdraw from the owner address - should fail because owner is contract itself
    await expect(
      instance.connect(owner).withdrawAll(owner.address)
    ).to.be.reverted;
  });
});