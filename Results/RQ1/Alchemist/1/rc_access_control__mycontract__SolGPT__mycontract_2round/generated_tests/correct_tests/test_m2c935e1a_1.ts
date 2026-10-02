import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant test - m2c935e1a", function () {
  it("should revert when owner calls sendTo due to mutant changing == to !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");
    
    // Owner should be able to call sendTo in original, but mutant requires msg.sender != owner
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.be.reverted;
  });
});