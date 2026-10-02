import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant maec7a2dc", function () {
  it("should kill mutant by deploying with a non-zero owner and calling withdrawAll from that owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to withdrawAll from the owner address
    // On original: succeeds because owner == msg.sender
    // On mutant: reverts because owner is address(0), not the caller
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.be.reverted;
  });
});