import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m129d5a48 test", function () {
  it("should kill mutant by calling withdrawAll from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether so withdrawAll can transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls withdrawAll to send balance to addr1
    const tx = instance.connect(owner).withdrawAll(addr1.address);
    // On the original, this succeeds. On the mutant (require(msg.sender != owner)), 
    // it reverts because owner == msg.sender, so the require fails.
    await expect(tx).to.not.be.reverted;
  });
});