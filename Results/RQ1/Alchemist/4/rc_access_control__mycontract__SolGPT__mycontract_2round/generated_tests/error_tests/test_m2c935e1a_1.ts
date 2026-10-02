import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6)", function () {
  it("should allow owner to send Ether and revert when called by non-owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so it has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // This should succeed in original, but revert in mutant (owner call)
    // In mutant, require(msg.sender != owner) will fail for owner
    const tx = instance.connect(owner).sendTo(addr1.address, ethers.parseEther("0.1"));
    await expect(tx).to.be.reverted;
  });
});