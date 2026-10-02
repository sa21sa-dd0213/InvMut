import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant test - m2c935e1a", function () {
  it("should allow non-owner to send ETH in mutant but revert in original", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");
    
    // Fund the contract so non-owner can send from it
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2")
    });

    // Non-owner should succeed in mutant (but would revert in original)
    await expect(
      instance.connect(addr1).sendTo(addr2.address, amount)
    ).to.not.be.reverted;
  });
});